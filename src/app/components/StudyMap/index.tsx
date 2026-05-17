"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./index.module.scss";

import {
  type CertificateResponse,
  CertificateService,
} from "@/app/http/certificate";
import { CheckpointService } from "@/app/http/checkpointService";
import { LessonService } from "@/app/http/lessonService";
import { MapService } from "@/app/http/mapService";
import { ProfileService } from "@/app/http/profile";
import type { MapElementResponse } from "@/app/http/types/map";

interface StudyMapProps {
  courseId: string;
  courseName?: string;
}

interface Position {
  x: number;
  y: number;
}

interface MapElement {
  id: string;
  type: "circle" | "image" | "lesson" | "text" | "checkpoint" | "emoji";
  color?: string;
  position: Position;
  positioning: "left" | "center" | "right" | "free";
  offset: Position;
  imageUrl?: string;
  title?: string;
  isActive?: boolean;
  stars?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  width?: number;
  height?: number;
  rotation?: number;
  emoji?: string;
}

interface MapSize {
  width: number;
  height: number;
}

interface MapBackground {
  color: string;
  image?: string;
  repeat?: string;
  size?: string;
}

interface LessonData {
  id: string;
  mapElementId: string;
  title: string;
  description: string;
  content?: string;
  duration?: number;
  orderIndex: number;
  isPublished: boolean;
}

interface CheckpointData {
  id: string;
  mapElementId: string;
  title: string;
  description: string;
  type: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  instructions?: string;
  isPublished: boolean;
}

interface ModalData {
  type: "lesson" | "checkpoint";
  elementId: string;
  title: string;
  description: string;
  targetId?: string;
  disabledReason?: string;
}

interface CourseProgressUnit {
  targetId: string;
  targetType: "lesson" | "checkpoint";
  mapElementId: string;
  orderIndex: number;
  bestResult: {
    countOfStars: number | null;
    completedAt: string;
    id: string;
  } | null;
}

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  left: `${(index * 4.17).toFixed(2)}%`,
  delay: `${(index % 6) * 0.12}s`,
  duration: `${3 + (index % 4) * 0.35}s`,
  rotation: `${(index * 19) % 360}deg`,
  color: ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#8338ec", "#fb5607"][
    index % 6
  ],
}));

const DEFAULT_ELEMENT_SIZES: Record<MapElement["type"], { width: number; height: number }> = {
  circle: { width: 40, height: 40 },
  image: { width: 60, height: 60 },
  lesson: { width: 72, height: 96 },
  text: { width: 200, height: 32 },
  checkpoint: { width: 44, height: 44 },
  emoji: { width: 48, height: 48 },
};

const getScaledValue = (value: number | undefined, fallback: number, scale: number) =>
  Math.max((value ?? fallback) * scale, 18);

const getUserId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("userId");
};

const getValidFontWeight = (weight?: string) => {
  const validWeights = new Set([
    "normal",
    "bold",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ]);

  return weight && validWeights.has(weight) ? weight : "normal";
};

const normalizeMapElement = (element: MapElementResponse): MapElement => ({
  id: element.id,
  type: element.type,
  color: element.color,
  position: { x: element.positionX, y: element.positionY },
  positioning: element.positioning,
  offset: { x: element.offsetX, y: element.offsetY },
  imageUrl: element.imageUrl,
  title: element.title,
  isActive: element.isActive,
  stars: element.stars,
  text: element.text,
  fontSize: element.fontSize,
  fontFamily: element.fontFamily,
  fontWeight: element.fontWeight,
  fontStyle: element.fontStyle,
  width: element.width,
  height: element.height,
  rotation: element.rotation || 0,
  emoji: element.emoji,
});

const StudyMap = ({ courseId, courseName = "Курс" }: StudyMapProps) => {
  const router = useRouter();
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const isCheckingCertificateRef = useRef(false);
  const shownCertificateCoursesRef = useRef<Set<string>>(new Set());

  const [mapSize, setMapSize] = useState<MapSize>({ width: 1200, height: 760 });
  const [mapBackground, setMapBackground] = useState<MapBackground>({
    color: "#f6f3ee",
    repeat: "no-repeat",
    size: "cover",
  });
  const [elements, setElements] = useState<MapElement[]>([]);
  const [lessonsData, setLessonsData] = useState<Record<string, LessonData>>({});
  const [checkpointsData, setCheckpointsData] = useState<Record<string, CheckpointData>>({});
  const [courseProgress, setCourseProgress] = useState<CourseProgressUnit[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificateData, setCertificateData] = useState<CertificateResponse | null>(null);
  const [certificateModalVisible, setCertificateModalVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const node = mapViewportRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const scaleFactor = useMemo(() => {
    if (!containerWidth || !mapSize.width) {
      return 1;
    }

    return containerWidth / mapSize.width;
  }, [containerWidth, mapSize.width]);

  const renderedHeight = useMemo(
    () => Math.max(Math.round(mapSize.height * scaleFactor), 320),
    [mapSize.height, scaleFactor]
  );

  const loadAdditionalData = useCallback(async (mapElements: MapElement[]) => {
    const lessons: Record<string, LessonData> = {};
    const checkpoints: Record<string, CheckpointData> = {};

    const lessonElements = mapElements.filter((element) => element.type === "lesson");

    await Promise.all(
      lessonElements.map(async (element) => {
        try {
          const lessonData = await LessonService.getLessonByMapElementId(element.id);

          lessons[element.id] = {
            id: lessonData.id,
            mapElementId: lessonData.mapElementId,
            title: lessonData.title,
            description: lessonData.description,
            content: lessonData.content,
            duration: lessonData.duration,
            orderIndex: lessonData.orderIndex,
            isPublished: lessonData.isPublished,
          };
        } catch (loadError) {
          console.warn(`Не удалось загрузить урок для элемента ${element.id}`, loadError);

          if (element.title) {
            lessons[element.id] = {
              id: `temp_${element.id}`,
              mapElementId: element.id,
              title: element.title,
              description: element.text || "",
              orderIndex: 999,
              isPublished: true,
            };
          }
        }
      })
    );

    const checkpointElements = mapElements.filter(
      (element) => element.type === "checkpoint"
    );

    await Promise.all(
      checkpointElements.map(async (element) => {
        try {
          const checkpointData = await CheckpointService.getCheckpointByMapElementId(
            element.id
          );

          checkpoints[element.id] = {
            id: checkpointData.id,
            mapElementId: checkpointData.mapElementId,
            title: checkpointData.title,
            description: checkpointData.description,
            type: checkpointData.type || "quiz",
            passingScore: checkpointData.passingScore,
            maxAttempts: checkpointData.maxAttempts,
            timeLimit: checkpointData.timeLimit,
            instructions: checkpointData.instructions,
            isPublished: checkpointData.isPublished,
          };
        } catch (loadError) {
          console.warn(
            `Не удалось загрузить контрольную точку для элемента ${element.id}`,
            loadError
          );

          if (element.title) {
            checkpoints[element.id] = {
              id: `temp_${element.id}`,
              mapElementId: element.id,
              title: element.title,
              description: element.text || "",
              type: "quiz",
              isPublished: true,
            };
          }
        }
      })
    );

    setLessonsData(lessons);
    setCheckpointsData(checkpoints);
  }, []);

  const loadCourseMap = useCallback(async () => {
    if (!courseId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const mapData = await MapService.getCourseMapByCourseId(courseId);
      const loadedElements = mapData.elements.map(normalizeMapElement);

      setMapSize({ width: mapData.width, height: mapData.height });
      setMapBackground({
        color: mapData.backgroundColor,
        image: mapData.backgroundImage,
        repeat: mapData.backgroundRepeat,
        size: mapData.backgroundSize,
      });
      setElements(loadedElements);

      await loadAdditionalData(loadedElements);
    } catch (loadError) {
      console.error("Ошибка загрузки карты:", loadError);
      setError("Не удалось загрузить карту курса.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId, loadAdditionalData]);

  const refreshLessonProgress = useCallback(async () => {
    const userId = getUserId();

    if (!courseId || !userId) {
      setCourseProgress([]);

      return;
    }

    try {
      setIsProgressLoading(true);

      const response = await ProfileService.getStudentCourseProgress(userId, courseId);

      setCourseProgress((response as CourseProgressUnit[]).sort((a, b) => a.orderIndex - b.orderIndex));
    } catch (progressError) {
      console.error("Ошибка загрузки прогресса курса:", progressError);
    } finally {
      setIsProgressLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCourseMap();
  }, [loadCourseMap]);

  useEffect(() => {
    void refreshLessonProgress();

    if (typeof window === "undefined") {
      return;
    }

    const handleWindowFocus = () => {
      void refreshLessonProgress();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshLessonProgress();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshLessonProgress]);

  const checkCertificateEligibility = useCallback(async () => {
    const userId = getUserId();

    if (!userId || !courseId || courseProgress.length === 0) {
      return;
    }

    if (
      shownCertificateCoursesRef.current.has(courseId) ||
      isCheckingCertificateRef.current
    ) {
      return;
    }

    const allLessonsCompleted = courseProgress.every((unit) => {
      const stars = unit.bestResult?.countOfStars;

      return stars !== null && stars !== undefined && stars > 0;
    });

    if (!allLessonsCompleted) {
      return;
    }

    const totalStars = courseProgress.reduce(
      (sum, unit) => sum + (unit.bestResult?.countOfStars || 0),
      0
    );
    const maxStars = courseProgress.length * 3;
    const completionPercent = maxStars > 0 ? (totalStars / maxStars) * 100 : 0;

    if (completionPercent < 90) {
      return;
    }

    isCheckingCertificateRef.current = true;

    try {
      const allCertificates = await CertificateService.getCertificatesByAuditoryId(userId);
      const courseCertificates = allCertificates.filter(
        (certificate) => certificate.courseId === courseId
      );

      if (courseCertificates.length > 0) {
        const latestCertificate = courseCertificates[0];

        if (!latestCertificate.isViewed) {
          shownCertificateCoursesRef.current.add(courseId);
          setCertificateData(latestCertificate);
          setShowConfetti(true);
          setCertificateModalVisible(true);
        }

        return;
      }

      const profile = await ProfileService.getFullProfileByAuditoryId(userId);
      const studentName =
        [profile.lastName, profile.firstName, profile.middleName]
          .filter(Boolean)
          .join(" ")
          .trim() || profile.email || "Студент";

      const createdCertificate = await CertificateService.createStudentCertificate(
        userId,
        studentName,
        courseName,
        courseId
      );

      shownCertificateCoursesRef.current.add(courseId);
      setCertificateData(createdCertificate);
      setShowConfetti(true);
      setCertificateModalVisible(true);
    } catch (certificateError) {
      console.error("Ошибка проверки сертификата:", certificateError);
    } finally {
      isCheckingCertificateRef.current = false;
    }
  }, [courseId, courseName, courseProgress]);

  useEffect(() => {
    void checkCertificateEligibility();
  }, [checkCertificateEligibility]);

  const getCourseUnitByMapElementId = useCallback(
    (mapElementId: string) => courseProgress.find((unit) => unit.mapElementId === mapElementId),
    [courseProgress]
  );

  const getStarsByMapElementId = useCallback(
    (mapElementId: string) => {
      return getCourseUnitByMapElementId(mapElementId)?.bestResult?.countOfStars || 0;
    },
    [getCourseUnitByMapElementId]
  );

  const isUnitAvailableByMapElementId = useCallback(
    (mapElementId: string) => {
      if (courseProgress.length === 0) {
        return true;
      }

      const currentIndex = courseProgress.findIndex((unit) => unit.mapElementId === mapElementId);

      if (currentIndex <= 0) {
        return true;
      }

      const previousLesson = courseProgress[currentIndex - 1];
      const previousStars = previousLesson?.bestResult?.countOfStars;

      return previousStars !== null && previousStars !== undefined && previousStars > 0;
    },
    [courseProgress]
  );

  const calculateElementPosition = useCallback(
    (element: MapElement): Position => {
      let baseX = 0;
      let baseY = 0;

      switch (element.positioning) {
        case "left":
          baseX = element.offset.x;
          baseY = element.offset.y;
          break;

        case "center":
          baseX = mapSize.width / 2 + element.offset.x;
          baseY = element.offset.y;
          break;

        case "right":
          baseX = mapSize.width + element.offset.x;
          baseY = element.offset.y;
          break;

        case "free":
          baseX = (element.position.x / 100) * mapSize.width;
          baseY = (element.position.y / 100) * mapSize.height;
          break;
      }

      return {
        x: baseX * scaleFactor,
        y: baseY * scaleFactor,
      };
    },
    [mapSize.height, mapSize.width, scaleFactor]
  );

  const openElementModal = useCallback(
    (element: MapElement) => {
      if (element.type === "lesson") {
        const lesson = lessonsData[element.id];
        const isAvailable = isUnitAvailableByMapElementId(element.id);

        setModalData({
          type: "lesson",
          elementId: element.id,
          title: lesson?.title || element.title || "Урок",
          description:
            lesson?.description ||
            element.text ||
            "Описание этого урока пока не заполнено.",
          targetId: lesson?.id,
          disabledReason: isAvailable
            ? undefined
            : "Сначала завершите предыдущий этап минимум на 1 звезду, чтобы открыть этот.",
        });

        return;
      }

      if (element.type === "checkpoint") {
        const checkpoint = checkpointsData[element.id];
        const isAvailable = isUnitAvailableByMapElementId(element.id);

        setModalData({
          type: "checkpoint",
          elementId: element.id,
          title: checkpoint?.title || element.title || "Контрольная точка",
          description:
            checkpoint?.description ||
            element.text ||
            "Описание контрольной точки пока не заполнено.",
          targetId: checkpoint?.id,
          disabledReason: isAvailable
            ? undefined
            : "Сначала завершите предыдущий этап минимум на 1 звезду, чтобы открыть этот.",
        });
      }
    },
    [checkpointsData, isUnitAvailableByMapElementId, lessonsData]
  );

  const handleNavigate = useCallback(() => {
    if (!modalData) {
      return;
    }

    if (modalData.type === "lesson" && modalData.targetId && !modalData.disabledReason) {
      router.push(`/study/${courseId}/lesson/${modalData.targetId}`);

      return;
    }

    if (modalData.type === "checkpoint" && modalData.targetId && !modalData.disabledReason) {
      router.push(`/study/${courseId}/checkpoint/${modalData.targetId}`);
    }
  }, [courseId, modalData, router]);

  const closeCertificateModal = useCallback(async () => {
    if (certificateData?.id) {
      try {
        await CertificateService.setIsViewed(certificateData.id);
      } catch (closeError) {
        console.error("Ошибка при отметке сертификата просмотренным:", closeError);
      }
    }

    shownCertificateCoursesRef.current.add(courseId);
    setCertificateModalVisible(false);
    setShowConfetti(false);
  }, [certificateData?.id, courseId]);

  const renderElement = (element: MapElement) => {
    const position = calculateElementPosition(element);
    const rotation = element.rotation || 0;
    const defaultSize = DEFAULT_ELEMENT_SIZES[element.type];
    const width = getScaledValue(element.width, defaultSize.width, scaleFactor);
    const height = getScaledValue(element.height, defaultSize.height, scaleFactor);

    const baseStyle: CSSProperties = {
      left: `${position.x}px`,
      top: `${position.y}px`,
      width,
      height,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    };

    if (element.type === "circle") {
      return (
        <div
          key={element.id}
          className={styles.elementCircle}
          style={{
            ...baseStyle,
            backgroundColor: element.color || "#ff6b6b",
            borderRadius: `${width / 2}px`,
          }}
        />
      );
    }

    if (element.type === "image") {
      return (
        <div key={element.id} className={styles.imageContainer} style={baseStyle}>
          {element.imageUrl ? (
            <img src={element.imageUrl} alt="" className={styles.elementImage} />
          ) : (
            <div className={styles.imagePlaceholder}>Изображение</div>
          )}
        </div>
      );
    }

    if (element.type === "lesson") {
      const lesson = lessonsData[element.id];
      const displayTitle = lesson?.title || element.title || "Урок";
      const starsCount = getStarsByMapElementId(element.id);
      const isAvailable = isUnitAvailableByMapElementId(element.id);
      const lessonStyle: CSSProperties = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      };

      return (
        <div
          key={element.id}
          className={styles.lessonContainer}
          style={lessonStyle}
          onClick={() => openElementModal(element)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openElementModal(element);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`${styles.lessonCircle} ${element.isActive ? styles.lessonActive : ""} ${
              !isAvailable ? styles.lessonDisabled : ""
            }`}
          >
            {displayTitle.charAt(0).toUpperCase()}
          </div>

          <div className={styles.starsArc}>
            {[1, 2, 3].map((star) => (
              <div
                key={`${element.id}_${star}`}
                className={`${styles.star} ${star <= starsCount ? styles.starFilled : ""}`}
              />
            ))}
          </div>

          <div className={styles.lessonTitle}>{displayTitle}</div>
        </div>
      );
    }

    if (element.type === "text") {
      return (
        <div
          key={element.id}
          className={styles.textElement}
          style={{
            ...baseStyle,
            width: `${Math.max(width, 80)}px`,
            minHeight: `${Math.max(height, 22)}px`,
            fontSize: `${Math.max((element.fontSize || 16) * scaleFactor, 12)}px`,
            fontFamily: element.fontFamily || "inherit",
            fontWeight: getValidFontWeight(element.fontWeight),
            fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
            color: element.color || "#171717",
          }}
        >
          {element.text}
        </div>
      );
    }

    if (element.type === "checkpoint") {
      const checkpoint = checkpointsData[element.id];
      const checkpointTitle = checkpoint?.title || element.title || "Контрольная точка";
      const markerSize = Math.max(width, 28);
      const starsCount = getStarsByMapElementId(element.id);
      const isAvailable = isUnitAvailableByMapElementId(element.id);
      const checkpointStyle: CSSProperties = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      };

      return (
        <button
          key={element.id}
          type="button"
          className={styles.checkpointContainer}
          style={checkpointStyle}
          onClick={() => openElementModal(element)}
        >
          <div
            className={styles.checkpointElement}
            style={{
              width: markerSize,
              height: markerSize,
              backgroundColor: element.color || "#ef4444",
              opacity: isAvailable ? 1 : 0.5,
            }}
          >
            <div className={styles.checkpointInner} />
          </div>

          <div className={styles.starsArc}>
            {[1, 2, 3].map((star) => (
              <div
                key={`${element.id}_${star}`}
                className={`${styles.star} ${star <= starsCount ? styles.starFilled : ""}`}
              />
            ))}
          </div>

          <span
            className={styles.checkpointTitle}
            style={{
              minWidth: `${Math.max(width * 2.2, 104)}px`,
              maxWidth: `${Math.max(width * 3.6, 156)}px`,
              fontSize: `${Math.max(12, 13 * Math.min(scaleFactor, 1.2))}px`,
            }}
          >
            {checkpointTitle}
          </span>
        </button>
      );
    }

    if (element.type === "emoji") {
      return (
        <div
          key={element.id}
          className={styles.emojiElement}
          style={{
            ...baseStyle,
            fontSize: `${Math.max((element.fontSize || 40) * scaleFactor, 18)}px`,
          }}
        >
          {element.emoji}
        </div>
      );
    }

    return null;
  };

  if (isLoading && elements.length === 0) {
    return <div className={styles.state}>Загрузка карты курса...</div>;
  }

  if (error) {
    return (
      <div className={styles.state}>
        <p>{error}</p>
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => {
            void loadCourseMap();
            void refreshLessonProgress();
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageInner}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Карта обучения</p>
            <h1 className={styles.title}>{courseName}</h1>
          </div>

          <div className={styles.meta}>
    
            <span>
              Прогресс:{" "}
              {isProgressLoading
                ? "обновляется..."
                : `${courseProgress.filter((unit) => (unit.bestResult?.countOfStars || 0) > 0).length}/${courseProgress.length}`}
            </span>
          </div>
        </div>

        <div className={styles.mapShell}>
          <div ref={mapViewportRef} className={styles.mapViewport}>
            <div
              className={styles.mapCanvas}
              style={{
                height: `${renderedHeight}px`,
                backgroundColor: mapBackground.color,
                backgroundImage: mapBackground.image
                  ? `url(${mapBackground.image})`
                  : undefined,
                backgroundRepeat: mapBackground.repeat || "no-repeat",
                backgroundSize: mapBackground.size || "cover",
              }}
            >
              {elements.map(renderElement)}
            </div>
          </div>
        </div>
      </div>

      {modalData ? (
        <div className={styles.modalOverlay} onClick={() => setModalData(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setModalData(null)}
            >
              ×
            </button>

            <h3 className={styles.modalTitle}>
              {modalData.type === "lesson" ? "Урок" : "Контрольная точка"}
            </h3>
            <h4 className={styles.modalSubtitle}>{modalData.title}</h4>
            <div className={styles.modalDescription}>
              <p>{modalData.description}</p>
            </div>

            {modalData.disabledReason ? (
              <div className={styles.modalHint}>{modalData.disabledReason}</div>
            ) : null}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setModalData(null)}
              >
                Закрыть
              </button>
              <button
                type="button"
                className={styles.navigateButton}
                onClick={handleNavigate}
                disabled={Boolean(modalData.disabledReason)}
              >
                {modalData.type === "lesson" ? "Перейти к уроку" : "Перейти к контрольной точке"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {certificateModalVisible && certificateData ? (
        <div className={styles.modalOverlay} onClick={() => void closeCertificateModal()}>
          <div
            className={`${styles.modalCard} ${styles.certificateCard}`}
            onClick={(event) => event.stopPropagation()}
          >
            {showConfetti ? (
              <div className={styles.confettiLayer} aria-hidden="true">
                {CONFETTI_PIECES.map((piece) => (
                  <span
                    key={piece.id}
                    className={styles.confettiPiece}
                    style={
                      {
                        left: piece.left,
                        animationDelay: piece.delay,
                        animationDuration: piece.duration,
                        backgroundColor: piece.color,
                        transform: `rotate(${piece.rotation})`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className={styles.modalClose}
              onClick={() => void closeCertificateModal()}
            >
              ×
            </button>

            <p className={styles.modalType}>Сертификат готов</p>
            <h2 className={styles.modalTitle}>Курс завершён</h2>
            <p className={styles.modalDescription}>
              Вы завершили курс минимум на 90% звёзд. Сертификат уже создан и доступен для
              просмотра.
            </p>

            <img
              src={certificateData.url}
              alt={`Сертификат курса ${certificateData.courseName}`}
              className={styles.certificateImage}
            />

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void closeCertificateModal()}
              >
                Позже
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => window.open(certificateData.url, "_blank", "noopener,noreferrer")}
              >
                Открыть сертификат
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default StudyMap;
