"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./index.module.scss";

import { CheckpointService } from "@/app/http/checkpointService";
import { LessonService } from "@/app/http/lessonService";
import { MapService } from "@/app/http/mapService";
/* eslint-disable */
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
  breakpoints?: {
    [breakpoint: string]: {
      hidden?: boolean;
      positioning?: "left" | "center" | "right" | "free";
      offset?: Position;
    };
  };
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
  id?: string;
  mapElementId: string;
  title: string;
  description: string;
  content?: string;
  duration?: number;
  orderIndex: number;
  isPublished: boolean;
}

interface CheckpointData {
  id?: string;
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
}

const MapViewer: React.FC = () => {
  const pathname = usePathname();

  const getCourseIdFromUrl = () => {
    if (!pathname) return null;
    const match = pathname.match(/\/courses\/(course_[^/]+)/);
    return match ? match[1] : null;
  };

  const courseId = getCourseIdFromUrl();

  const [mapSize, setMapSize] = useState<MapSize>({ width: 800, height: 600 });
  const [mapBackground, setMapBackground] = useState<MapBackground>({
    color: "#ffffff",
    repeat: "no-repeat",
    size: "cover",
  });
  const [elements, setElements] = useState<MapElement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonsData, setLessonsData] = useState<Record<string, LessonData>>({});
  const [checkpointsData, setCheckpointsData] = useState<Record<string, CheckpointData>>({});
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>("desktop");
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Загрузка карты при монтировании
  useEffect(() => {
    if (courseId) {
      loadCourseMap();
    }
  }, [courseId]);

  const loadCourseMap = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const mapData = await MapService.getCourseMapByCourseId(courseId!);

      setMapSize({ width: mapData.width, height: mapData.height });
      setMapBackground({
        color: mapData.backgroundColor,
        image: mapData.backgroundImage,
        repeat: mapData.backgroundRepeat,
        size: mapData.backgroundSize,
      });

      // Преобразуем элементы из серверного формата
      const loadedElements = mapData.elements.map((element: any) => ({
        id: element.id,
        type: element.type as MapElement["type"],
        color: element.color,
        position: { x: element.positionX, y: element.positionY },
        positioning: element.positioning as MapElement["positioning"],
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
        breakpoints: element.breakpoints,
      }));

      setElements(loadedElements);

      // Загружаем дополнительные данные для уроков и контрольных точек
      await loadAdditionalData(loadedElements);
    } catch (error: any) {
      console.error("❌ Ошибка загрузки карты:", error);
      setError("Не удалось загрузить карту.");
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка дополнительных данных для уроков и контрольных точек
  const loadAdditionalData = async (elements: MapElement[]) => {
    try {
      const lessons: Record<string, LessonData> = {};
      const checkpoints: Record<string, CheckpointData> = {};

      // Загружаем данные для каждого урока
      const lessonElements = elements.filter((el) => el.type === "lesson");
      for (const element of lessonElements) {
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
        } catch (error) {
          console.warn(`⚠️ Не удалось загрузить данные урока для элемента: ${element.id}`, error);
          lessons[element.id] = {
            mapElementId: element.id,
            title: element.title || `Урок ${element.id.substring(0, 8)}`,
            description: element.text || "",
            orderIndex: 0,
            isPublished: true,
          };
        }
      }

      // Загружаем данные для каждой контрольной точки
      const checkpointElements = elements.filter((el) => el.type === "checkpoint");
      for (const element of checkpointElements) {
        try {
          const checkpointData = await CheckpointService.getCheckpointByMapElementId(element.id);
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
        } catch (error) {
          console.warn(
            `⚠️ Не удалось загрузить данные контрольной точки для элемента: ${element.id}`,
            error
          );
          checkpoints[element.id] = {
            mapElementId: element.id,
            title: element.title || `Контрольная точка ${element.id.substring(0, 8)}`,
            description: element.text || "",
            type: "quiz",
            isPublished: true,
          };
        }
      }

      setLessonsData(lessons);
      setCheckpointsData(checkpoints);
    } catch (error) {
      console.error("❌ Ошибка загрузки дополнительных данных:", error);
    }
  };

  // Функция для получения настроек элемента для текущего брейкпоинта
  const getElementBreakpointSettings = (element: MapElement) => {
    if (!element.breakpoints || !element.breakpoints[activeBreakpoint]) {
      return {};
    }
    return element.breakpoints[activeBreakpoint];
  };

  // Функция для вычисления позиции элемента с учетом брейкпоинта и размера карты
  const calculateElementPosition = (element: MapElement): Position => {
    const breakpointSettings = getElementBreakpointSettings(element);
    const isHidden = breakpointSettings.hidden;

    if (isHidden) {
      return { x: -1000, y: -1000 };
    }

    const currentPositioning = breakpointSettings.positioning || element.positioning;
    const currentOffset = breakpointSettings.offset || element.offset;

    const basePosition = { x: 0, y: 0 };

    switch (currentPositioning) {
      case "left":
        basePosition.x = currentOffset.x;
        break;
      case "center":
        basePosition.x = mapSize.width / 2 + currentOffset.x;
        break;
      case "right":
        basePosition.x = mapSize.width + currentOffset.x;
        break;
      case "free":
        basePosition.x = (element.position.x / 100) * mapSize.width;
        basePosition.y = (element.position.y / 100) * mapSize.height;
        break;
    }

    if (currentPositioning !== "free") {
      basePosition.y = currentOffset.y;
    }

    return basePosition;
  };

  // Обработчик клика на элемент
  const handleElementClick = (element: MapElement) => {
    if (element.type === "lesson") {
      const lessonData = lessonsData[element.id];
      if (lessonData) {
        setModalData({
          type: "lesson",
          elementId: element.id,
          title: lessonData.title,
          description: lessonData.description,
          targetId: lessonData.id,
        });
      }
    } else if (element.type === "checkpoint") {
      const checkpointData = checkpointsData[element.id];
      if (checkpointData) {
        setModalData({
          type: "checkpoint",
          elementId: element.id,
          title: checkpointData.title,
          description: checkpointData.description,
          targetId: checkpointData.id,
        });
      }
    }
  };

  // Обработчик наведения на элемент
  const handleElementMouseEnter = (elementId: string) => {
    setHoveredElementId(elementId);
  };

  const handleElementMouseLeave = () => {
    setHoveredElementId(null);
  };

  // Обработчик перехода к уроку или контрольной точке
  const handleNavigate = () => {
    if (!modalData || !modalData.targetId) return;

    if (modalData.type === "lesson") {
      window.location.href = `/lessons/${modalData.targetId}`;
    } else if (modalData.type === "checkpoint") {
      window.location.href = `/checkpoints/${modalData.targetId}`;
    }
  };

  // Рендер элемента
  const renderElement = (element: MapElement) => {
    const position = calculateElementPosition(element);
    const breakpointSettings = getElementBreakpointSettings(element);
    const isHidden = breakpointSettings.hidden;
    const rotation = element.rotation || 0;
    const isHovered = hoveredElementId === element.id;
    const isClickable = element.type === "lesson" || element.type === "checkpoint";

    const baseStyle = {
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      display: isHidden ? "none" : "flex",
    };

    const handleClick = isClickable ? () => handleElementClick(element) : undefined;
    const handleMouseEnter = isClickable ? () => handleElementMouseEnter(element.id) : undefined;
    const handleMouseLeave = isClickable ? handleElementMouseLeave : undefined;

    switch (element.type) {
      case "circle":
        return (
          <div
            key={element.id}
            className={`${styles.elementCircle} ${isHovered ? styles.elementHovered : ""}`}
            style={{
              ...baseStyle,
              backgroundColor: element.color || "#ff6b6b",
              width: element.width || 40,
              height: element.height || 40,
              display: isHidden ? "none" : "block",
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        );

      case "image":
        return (
          <div
            key={element.id}
            className={`${styles.imageContainer} ${isHovered ? styles.elementHovered : ""}`}
            style={{
              ...baseStyle,
              width: element.width || 60,
              height: element.height || 60,
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {element.imageUrl ? (
              <img
                src={element.imageUrl}
                alt="Element"
                className={styles.elementImage}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className={styles.imagePlaceholder}>Изображение</div>
            )}
          </div>
        );

      case "lesson":
        const lessonData = lessonsData[element.id];
        const displayTitle = lessonData?.title || element.title;
        return (
          <div
            key={element.id}
            className={`${styles.lessonContainer} ${isHovered ? styles.elementHovered : ""}`}
            style={baseStyle}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={`${styles.lessonCircle} ${element.isActive ? styles.lessonActive : ""}`}
            >
              {displayTitle?.charAt(0) || "У"}
            </div>
            <div className={styles.starsArc}>
              {[1, 2, 3].map((star) => (
                <div
                  key={star}
                  className={`${styles.star} ${star <= (element.stars || 0) ? styles.starFilled : ""}`}
                />
              ))}
            </div>
            <div className={styles.lessonTitle}>{displayTitle}</div>
          </div>
        );

      case "text":
        return (
          <div
            key={element.id}
            className={`${styles.textElement} ${isHovered ? styles.elementHovered : ""}`}
            style={{
              ...baseStyle,
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || "Arial, sans-serif",
              fontWeight: element.fontWeight || "normal",
              fontStyle: element.fontStyle || "normal",
              color: element.color || "#000000",
              width: element.width || "auto",
              display: isHidden ? "none" : "block",
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {element.text}
          </div>
        );

      case "checkpoint":
        const checkpointData = checkpointsData[element.id];
        const checkpointTitle = checkpointData?.title || element.title;
        return (
          <div
            key={element.id}
            className={`${styles.checkpointContainer} ${isHovered ? styles.elementHovered : ""}`}
            style={baseStyle}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={styles.checkpointElement}
              style={{
                backgroundColor: element.color || "#ff0000",
                width: element.width || 40,
                height: element.height || 40,
              }}
            >
              <div className={styles.checkpointInner}></div>
            </div>
            <div className={styles.checkpointTitle}>{checkpointTitle}</div>
          </div>
        );

      case "emoji":
        return (
          <div
            key={element.id}
            className={`${styles.emojiElement} ${isHovered ? styles.elementHovered : ""}`}
            style={{
              ...baseStyle,
              fontSize: element.fontSize || 40,
              width: element.width || 40,
              height: element.height || 40,
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {element.emoji}
          </div>
        );

      default:
        return null;
    }
  };

  // Стили для фона карты
  const mapBackgroundStyle = {
    backgroundColor: mapBackground.color,
    backgroundImage: mapBackground.image ? `url(${mapBackground.image})` : "none",
    backgroundRepeat: mapBackground.repeat as any,
    backgroundSize: mapBackground.size as any,
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка карты...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <div style={{ color: "red" }}>{error}</div>
        <button className={styles.retryButton} onClick={loadCourseMap}>
          Повторить попытку
        </button>
      </div>
    );
  }

  if (!courseId) {
    return <div className={styles.noCourse}>Курс не найден в URL</div>;
  }

  return (
    <div className={styles.mapViewer}>
      {/* Основной контейнер карты */}
      <div
        className={styles.mapContainer}
        style={{
          width: `${mapSize.width}px`,
          height: `${mapSize.height}px`,
          ...mapBackgroundStyle,
        }}
      >
        <div className={styles.mapContent}>{elements.map((element) => renderElement(element))}</div>
      </div>

      {/* Информационная панель */}
      <div className={styles.mapInfo}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Размер карты:</span>
          <span className={styles.infoValue}>
            {mapSize.width} × {mapSize.height}px
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Элементов:</span>
          <span className={styles.infoValue}>{elements.length}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Уроков:</span>
          <span className={styles.infoValue}>{Object.keys(lessonsData).length}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Контрольных точек:</span>
          <span className={styles.infoValue}>{Object.keys(checkpointsData).length}</span>
        </div>
        <div className={styles.infoHint}>
          Нажмите на урок или контрольную точку для просмотра деталей
        </div>
      </div>

      {/* Модальное окно для уроков и контрольных точек */}
      {modalData && (
        <div className={styles.modalOverlay} onClick={() => setModalData(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setModalData(null)}>
              ×
            </button>
            <h3 className={styles.modalTitle}>
              {modalData.type === "lesson" ? "Урок" : "Контрольная точка"}
            </h3>
            <h4 className={styles.modalSubtitle}>{modalData.title}</h4>
            <div className={styles.modalDescription}>
              <p>{modalData.description}</p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setModalData(null)}>
                Закрыть
              </button>
              <button className={styles.navigateButton} onClick={handleNavigate}>
                {modalData.type === "lesson" ? "Перейти к уроку" : "Перейти к контрольной точке"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
/* eslint-disable */
export default MapViewer;
