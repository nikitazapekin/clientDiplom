"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import Button from "../Button";

import { BlockEditor } from "./BlockEditor";
import {
  createCodeExampleBlock,
  createCodeTaskBlock,
  createFillCodeTaskBlock,
  createImageBlock,
  createSourceBlock,
  createTableBlock,
  createTextBlock,
  createTheoryQuestionBlock,
  genId,
} from "./blockFactories";
import { sortBlocks } from "./editorShared";
import { normalizeFillTaskBlock } from "./fillTaskUtils";
import styles from "./index.module.scss";
import { BlockReviewModal, BlockReviewsModal, ResultsModal, SourceModal } from "./modals";
import { PreviewBlock, PreviewBlockStatic } from "./PreviewBlocks";
import type {
  CodeTaskBlock,
  FillCodeTaskBlock,
  Slide,
  SlideBlock,
  SlideType,
  SourceBlock,
  TheoryQuestionBlock,
} from "./types";

import { AdminService } from "@/app/http/admin";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import { LessonDetailsService } from "@/app/http/lessonDetailsService";
import { ProfileService } from "@/app/http/profile";
import { type BlockReview, ReviewService, ReviewStatus } from "@/app/http/reviewService";

/* eslint-disable */

type ReviewTargetType = "slide" | "test";
type ReviewerInfo = {
  reviewerId: string;
  reviewerName: string;
};

const REVIEWABLE_BLOCK_FIELDS = new Set(["id", "order", "type", "file"]);
const TEST_TASK_BLOCK_TYPES: SlideBlock["type"][] = ["codeTask", "fillCodeTask", "theoryQuestion"];

const getReviewTargetType = (slideType: SlideType): ReviewTargetType =>
  slideType === "test" ? "test" : "slide";

const getReviewBlockKey = (slideId: string, blockId: string, targetType: ReviewTargetType) =>
  `${targetType}:${slideId}:${blockId}`;

const cloneBlock = <T extends SlideBlock>(block: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(block);
  }

  return JSON.parse(JSON.stringify(block)) as T;
};

const normalizeComparableValue = (value: unknown) => {
  if (value && typeof value === "object" && "file" in (value as Record<string, unknown>)) {
    const { file, ...rest } = value as Record<string, unknown>;
    return rest;
  }

  return value;
};

const buildReviewChanges = (
  originalBlock: SlideBlock,
  draftBlock: SlideBlock
): Record<string, unknown> => {
  const originalRecord = originalBlock as unknown as Record<string, unknown>;
  const draftRecord = draftBlock as unknown as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(originalRecord), ...Object.keys(draftRecord)]));

  return keys.reduce<Record<string, unknown>>((changes, key) => {
    if (REVIEWABLE_BLOCK_FIELDS.has(key)) {
      return changes;
    }

    const originalValue = normalizeComparableValue(originalRecord[key]);
    const draftValue = normalizeComparableValue(draftRecord[key]);

    if (JSON.stringify(originalValue) !== JSON.stringify(draftValue)) {
      changes[key] = draftValue;
    }

    return changes;
  }, {});
};

interface EditLessonProps {
  mode?: "lesson" | "checkpoint";
}

export default function EditLesson({ mode = "lesson" }: EditLessonProps) {
  const params = useParams();
  const entityId = params?.id as string;
  const isCheckpointMode = mode === "checkpoint";
  const entityTitle = isCheckpointMode ? "контрольной точки" : "урока";
  const entityDisplayTitle = isCheckpointMode ? "Контрольная точка" : "Урок";

  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState<Record<string, string | number>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [fillTaskAnswers, setFillTaskAnswers] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [fillTaskErrors, setFillTaskErrors] = useState<Record<string, string>>({});
  const [fillTaskResults, setFillTaskResults] = useState<
    Record<string, { passed: boolean; matchedCaseIndex: number | null; totalCases: number }>
  >({});
  const [codeRunOutput, setCodeRunOutput] = useState<Record<string, string>>({});
  const [codeRunLoading, setCodeRunLoading] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetailsId, setLessonDetailsId] = useState<string | null>(null);
  const [reviewerInfo, setReviewerInfo] = useState<ReviewerInfo | null>(null);
  const [blockReviews, setBlockReviews] = useState<Record<string, BlockReview[]>>({});
  const [reviewsLoading, setReviewsLoading] = useState<Record<string, boolean>>({});
  const [reviewActionLoading, setReviewActionLoading] = useState<Record<string, boolean>>({});
  const [reviewModalBlock, setReviewModalBlock] = useState<{
    slideIndex: number;
    blockId: string;
  } | null>(null);
  const [reviewListBlock, setReviewListBlock] = useState<{
    slideIndex: number;
    blockId: string;
  } | null>(null);
  const [reviewDraftBlock, setReviewDraftBlock] = useState<SlideBlock | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<{ url: string; note?: string }[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const testResultsRef = useRef<Record<string, any>>({});
  const isMovingBlock = useRef(false);

  const [lessonResults, setLessonResults] = useState<{
    results: any[];
    totalTasks: number;
    completedTasks: number;
    totalTestCases: number;
    passedTestCases: number;
    constraintsPassed: boolean;
  }>({
    results: [],
    totalTasks: 0,
    completedTasks: 0,
    totalTestCases: 0,
    passedTestCases: 0,
    constraintsPassed: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadReviewerInfo = async () => {
      if (typeof window === "undefined") {
        return;
      }

      const reviewerId = localStorage.getItem("userId");
      const fallbackEmail = localStorage.getItem("userEmail");

      if (!reviewerId) {
        return;
      }

      try {
        const adminProfile = await AdminService.getAdminByAuditoryId(reviewerId);
        const reviewerName = [
          adminProfile.firstName,
          adminProfile.lastName,
          adminProfile.middleName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (!cancelled) {
          setReviewerInfo({
            reviewerId,
            reviewerName: reviewerName || fallbackEmail || reviewerId,
          });
        }
        return;
      } catch (adminError) {
        console.warn("Unable to load admin reviewer profile", adminError);
      }

      try {
        const profile = await ProfileService.getFullProfileByAuditoryId(reviewerId);
        const reviewerName = [profile.firstName, profile.lastName, profile.middleName]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (!cancelled) {
          setReviewerInfo({
            reviewerId,
            reviewerName: reviewerName || fallbackEmail || reviewerId,
          });
        }
      } catch (profileError) {
        console.warn("Unable to load client reviewer profile", profileError);

        if (!cancelled) {
          setReviewerInfo({
            reviewerId,
            reviewerName: fallbackEmail || reviewerId,
          });
        }
      }
    };

    loadReviewerInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadLessonDetails = useCallback(async () => {
    if (!entityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = isCheckpointMode
        ? await LessonDetailsService.getLessonDetailsByCheckpointId(entityId)
        : await LessonDetailsService.getLessonDetailsByLessonId(entityId);
      setLessonDetailsId(data.id);

      const lessonSlides: Slide[] = isCheckpointMode
        ? []
        : data.slides.map((slide) => ({
            id: slide.id,
            title: slide.title,
            type: slide.type as SlideType,
            order: slide.orderIndex,
            isPersisted: true,
            blocks: ((slide.blocks || []) as unknown as SlideBlock[]).map((block) =>
              block.type === "fillCodeTask" ? normalizeFillTaskBlock(block) : block
            ),
          }));

      const testSlides: Slide[] = data.tests.map((test) => ({
        id: test.id,
        title: test.title,
        type: "test" as const,
        order: test.orderIndex,
        isPersisted: true,
        blocks: ((test.blocks || []) as unknown as SlideBlock[]).map((block) =>
          block.type === "fillCodeTask" ? normalizeFillTaskBlock(block) : block
        ),
      }));

      const allSlides: Slide[] = [
        ...lessonSlides,
        ...testSlides.map((test) => ({
          id: test.id,
          title: test.title,
          type: "test" as const,
          order: test.order,
          isPersisted: test.isPersisted,
          blocks: test.blocks,
        })),
      ].sort((first, second) => first.order - second.order);

      setSlides(allSlides);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSlides([]);
        setLessonDetailsId(null);
        setBlockReviews({});
      } else {
        setError(err.message || `Ошибка загрузки ${entityTitle}`);
        console.error(`Error loading ${entityTitle}:`, err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityTitle, isCheckpointMode]);

  useEffect(() => {
    loadLessonDetails();
  }, [loadLessonDetails]);

  const selectedSlide = selectedSlideIndex !== null ? slides[selectedSlideIndex] : null;

  const addSlide = useCallback(
    (type: SlideType) => {
      const slideType = isCheckpointMode ? "test" : type;
      const newSlide: Slide = {
        id: genId(),
        title:
          slideType === "lesson"
            ? "Новый слайд"
            : isCheckpointMode
              ? "Новое задание"
              : "Новый тест",
        type: slideType,
        order: slides.length,
        isPersisted: false,
        blocks: [],
      };

      setSlides((prev) => [...prev, newSlide]);
      setSelectedSlideIndex(slides.length);
    },
    [isCheckpointMode, slides.length]
  );

  const updateSlide = useCallback((index: number, patch: Partial<Slide>) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const deleteSlide = useCallback(
    (index: number) => {
      setSlides((prev) => {
        const next = prev.filter((_, currentIndex) => currentIndex !== index);
        const reordered = next.map((slide, currentIndex) => ({ ...slide, order: currentIndex }));

        if (selectedSlideIndex === index) {
          setSelectedSlideIndex(null);
        } else if (selectedSlideIndex !== null && selectedSlideIndex > index) {
          setSelectedSlideIndex(selectedSlideIndex - 1);
        }

        return reordered;
      });
    },
    [selectedSlideIndex]
  );

  const addBlock = useCallback((slideIndex: number, kind: SlideBlock["type"]) => {
    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      if (slide.type === "test" && TEST_TASK_BLOCK_TYPES.includes(kind)) {
        const hasTaskBlock = slide.blocks.some((block) =>
          TEST_TASK_BLOCK_TYPES.includes(block.type)
        );

        if (hasTaskBlock) {
          setError("На тестовом слайде может быть только одно задание.");
          return prev;
        }
      }

      const order = slide.blocks.length;
      let block: SlideBlock;

      switch (kind) {
        case "text":
          block = createTextBlock(order);
          break;
        case "codeExample":
          block = createCodeExampleBlock(order);
          break;
        case "source":
          block = createSourceBlock(order);
          break;
        case "table":
          block = createTableBlock(order);
          break;
        case "image":
          block = createImageBlock(order);
          break;
        case "codeTask":
          block = createCodeTaskBlock(order);
          break;
        case "fillCodeTask":
          block = createFillCodeTaskBlock(order);
          break;
        case "theoryQuestion":
          block = createTheoryQuestionBlock(order);
          break;
        default:
          return prev;
      }

      next[slideIndex] = {
        ...slide,
        blocks: [...slide.blocks, block],
      };

      return next;
    });
  }, []);

  const updateBlock = useCallback(
    (slideIndex: number, blockId: string, patch: Partial<SlideBlock>) => {
      setSlides((prev) => {
        const next = [...prev];
        const slide = next[slideIndex];
        if (!slide) return prev;

        next[slideIndex] = {
          ...slide,
          blocks: slide.blocks.map((block) =>
            block.id === blockId ? { ...block, ...patch } : block
          ) as SlideBlock[],
        };

        return next;
      });
    },
    []
  );

  const loadReviewsForSlide = useCallback(async (slide: Slide | null) => {
    if (!slide?.isPersisted) {
      return;
    }

    const reviewTargetType = getReviewTargetType(slide.type);

    setReviewsLoading((prev) => ({ ...prev, [slide.id]: true }));

    try {
      const reviews =
        reviewTargetType === "test"
          ? await ReviewService.getTestReviews(slide.id)
          : await ReviewService.getSlideReviews(slide.id);

      setBlockReviews((prev) => {
        const next = { ...prev };

        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${reviewTargetType}:${slide.id}:`)) {
            delete next[key];
          }
        });

        slide.blocks.forEach((block) => {
          next[getReviewBlockKey(slide.id, block.id, reviewTargetType)] = [];
        });

        reviews.forEach((review) => {
          const reviewKey = getReviewBlockKey(slide.id, review.blockId, reviewTargetType);
          next[reviewKey] = [...(next[reviewKey] ?? []), review];
        });

        return next;
      });
    } catch (reviewsError) {
      console.error("Error loading block reviews:", reviewsError);
      setError("Не удалось загрузить правки для выбранного слайда");
    } finally {
      setReviewsLoading((prev) => ({ ...prev, [slide.id]: false }));
    }
  }, []);

  const getReviewsForBlock = useCallback(
    (slide: Slide | null, blockId: string) => {
      if (!slide) {
        return [];
      }

      return (
        blockReviews[getReviewBlockKey(slide.id, blockId, getReviewTargetType(slide.type))] ?? []
      );
    },
    [blockReviews]
  );

  const closeReviewModal = useCallback(() => {
    setReviewModalBlock(null);
    setReviewDraftBlock(null);
    setReviewComment("");
    setIsSubmittingReview(false);
  }, []);

  const closeReviewListModal = useCallback(() => {
    setReviewListBlock(null);
  }, []);

  const openReviewModal = useCallback(
    (slideIndex: number, blockId: string) => {
      const slide = slides[slideIndex];
      const block = slide?.blocks.find((item) => item.id === blockId);

      if (!slide || !block) {
        return;
      }

      if (!slide.isPersisted) {
        setError(
          `Сначала сохраните ${isCheckpointMode ? "контрольную точку" : "урок"}, чтобы создавать правки для этого слайда.`
        );
        return;
      }

      if (!reviewerInfo) {
        setError("Не удалось определить текущего рецензента.");
        return;
      }

      setReviewModalBlock({ slideIndex, blockId });
      setReviewDraftBlock(cloneBlock(block));
      setReviewComment("");
    },
    [isCheckpointMode, reviewerInfo, slides]
  );

  const openReviewListModal = useCallback((slideIndex: number, blockId: string) => {
    setReviewListBlock({ slideIndex, blockId });
  }, []);

  const handleReviewDraftChange = useCallback((patch: Partial<SlideBlock>) => {
    setReviewDraftBlock((prev) => (prev ? ({ ...prev, ...patch } as SlideBlock) : prev));
  }, []);

  const handleReviewDraftImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setReviewDraftBlock((prev) =>
        prev
          ? ({
              ...prev,
              url: reader.result as string,
              file,
            } as SlideBlock)
          : prev
      );
    };
    reader.readAsDataURL(file);
  }, []);

  const submitReview = useCallback(async () => {
    if (!reviewModalBlock || !reviewDraftBlock || !reviewerInfo) {
      return;
    }

    const slide = slides[reviewModalBlock.slideIndex];
    const originalBlock = slide?.blocks.find((block) => block.id === reviewModalBlock.blockId);

    if (!slide || !originalBlock) {
      setError("Блок для правки не найден");
      return;
    }

    const proposedChanges = buildReviewChanges(originalBlock, reviewDraftBlock);

    if (Object.keys(proposedChanges).length === 0) {
      setError("Нет изменений для отправки");
      return;
    }

    setIsSubmittingReview(true);
    setError(null);

    try {
      const createdReviewBlock = {
        slideIndex: reviewModalBlock.slideIndex,
        blockId: reviewModalBlock.blockId,
      };
      const payload = {
        blockId: originalBlock.id,
        reviewerId: reviewerInfo.reviewerId,
        reviewerName: reviewerInfo.reviewerName,
        proposedChanges,
        comment: reviewComment.trim() || "Предлагаемое изменение блока",
      };

      if (getReviewTargetType(slide.type) === "test") {
        await ReviewService.createTestReview({
          testId: slide.id,
          ...payload,
        });
      } else {
        await ReviewService.createSlideReview({
          slideId: slide.id,
          ...payload,
        });
      }

      await loadReviewsForSlide(slide);
      setReviewListBlock(createdReviewBlock);
      closeReviewModal();
    } catch (reviewError: any) {
      setError(
        reviewError.response?.data?.message || reviewError.message || "Ошибка создания правки"
      );
    } finally {
      setIsSubmittingReview(false);
    }
  }, [
    closeReviewModal,
    loadReviewsForSlide,
    reviewComment,
    reviewDraftBlock,
    reviewModalBlock,
    reviewerInfo,
    slides,
  ]);

  const handleReviewDecision = useCallback(
    async (
      slideIndex: number,
      blockId: string,
      review: BlockReview,
      action: "accept" | "reject"
    ) => {
      const slide = slides[slideIndex];

      if (!slide) {
        return;
      }

      setReviewActionLoading((prev) => ({ ...prev, [review.id]: true }));
      setError(null);

      try {
        const updatedReview =
          action === "accept"
            ? getReviewTargetType(slide.type) === "test"
              ? await ReviewService.acceptTestReview(review.id)
              : await ReviewService.acceptSlideReview(review.id)
            : getReviewTargetType(slide.type) === "test"
              ? await ReviewService.rejectTestReview(review.id)
              : await ReviewService.rejectSlideReview(review.id);

        if (action === "accept") {
          updateBlock(slideIndex, blockId, updatedReview.proposedChanges as Partial<SlideBlock>);
        }

        setBlockReviews((prev) => {
          const reviewKey = getReviewBlockKey(slide.id, blockId, getReviewTargetType(slide.type));
          return {
            ...prev,
            [reviewKey]: (prev[reviewKey] ?? []).map((item) =>
              item.id === updatedReview.id ? updatedReview : item
            ),
          };
        });
      } catch (reviewError: any) {
        setError(
          reviewError.response?.data?.message ||
            reviewError.message ||
            "Не удалось обновить статус правки"
        );
      } finally {
        setReviewActionLoading((prev) => ({ ...prev, [review.id]: false }));
      }
    },
    [slides, updateBlock]
  );

  useEffect(() => {
    if (!selectedSlide?.isPersisted) {
      return;
    }

    loadReviewsForSlide(selectedSlide);
  }, [loadReviewsForSlide, selectedSlide?.id, selectedSlide?.isPersisted, selectedSlide?.type]);

  useEffect(() => {
    if (reviewModalBlock && reviewModalBlock.slideIndex !== selectedSlideIndex) {
      closeReviewModal();
    }
  }, [closeReviewModal, reviewModalBlock, selectedSlideIndex]);

  useEffect(() => {
    if (reviewListBlock && reviewListBlock.slideIndex !== selectedSlideIndex) {
      closeReviewListModal();
    }
  }, [closeReviewListModal, reviewListBlock, selectedSlideIndex]);

  const deleteBlock = useCallback((slideIndex: number, blockId: string) => {
    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      const blocks = slide.blocks.filter((block) => block.id !== blockId);
      next[slideIndex] = {
        ...slide,
        blocks: blocks.map((block, index) => ({ ...block, order: index })) as SlideBlock[],
      };

      return next;
    });
  }, []);

  const moveBlock = useCallback((slideIndex: number, blockId: string, direction: "up" | "down") => {
    isMovingBlock.current = true;

    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      const sorted = sortBlocks(slide.blocks);
      const currentIndex = sorted.findIndex((block) => block.id === blockId);
      if (currentIndex === -1) return prev;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= sorted.length) return prev;

      const swapped = sorted.map((block, index) => {
        if (index === currentIndex) return { ...block, order: newIndex };
        if (index === newIndex) return { ...block, order: currentIndex };
        return { ...block };
      });

      next[slideIndex] = { ...slide, blocks: sortBlocks(swapped) };
      return next;
    });

    setTimeout(() => {
      isMovingBlock.current = false;
    }, 0);
  }, []);

  const handleImageUpload = useCallback(
    (slideIndex: number, blockId: string, file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(slideIndex, blockId, {
          url: reader.result as string,
          file,
        });
      };
      reader.readAsDataURL(file);
    },
    [updateBlock]
  );

  const runCode = useCallback(async (blockId: string, language: CodeLanguage, code: string) => {
    setCodeRunLoading((prev) => ({ ...prev, [blockId]: true }));
    setCodeRunOutput((prev) => ({ ...prev, [blockId]: "" }));

    try {
      const response = await CodeService.executeCode({ language, code });
      const text = response.error ? `Ошибка: ${response.error}` : response.output || "";
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: text }));
    } catch (executionError) {
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: `Ошибка: ${executionError}` }));
    } finally {
      setCodeRunLoading((prev) => ({ ...prev, [blockId]: false }));
    }
  }, []);

  const openSourcesModal = useCallback((sources: { url: string; note?: string }[]) => {
    setCurrentSources(sources);
    setSourceModalOpen(true);
  }, []);

  const calculateResults = useCallback(() => {
    const testSlides = slides.filter((slide) => slide.type === "test");
    const currentTestResults = testResultsRef.current;

    const results: any[] = [];
    let completedTasks = 0;
    let totalTestCases = 0;
    let passedTestCases = 0;
    let constraintsPassed = true;

    testSlides.forEach((slide) => {
      const slideTestResult = currentTestResults[slide.id];
      const codeTasks = slide.blocks.filter(
        (block) => block.type === "codeTask"
      ) as CodeTaskBlock[];
      const fillCodeTasks = slide.blocks.filter(
        (block) => block.type === "fillCodeTask"
      ) as FillCodeTaskBlock[];
      const theoryQuestions = slide.blocks.filter(
        (block) => block.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      let slidePassed = codeTasks.length + fillCodeTasks.length + theoryQuestions.length > 0;
      let slideTestCasesPassed = 0;
      let slideTestCasesTotal = 0;
      let slideConstraintsPassed = true;

      if (codeTasks.length > 0) {
        if (slideTestResult) {
          slideTestCasesPassed = slideTestResult.passedTests || 0;
          slideTestCasesTotal = slideTestResult.totalTests || 0;
          slideConstraintsPassed = slideTestResult.constraintsPassed || false;
          slidePassed = slidePassed && (slideTestResult.allPassed || false);
        } else {
          slidePassed = false;
        }
      }

      if (fillCodeTasks.length > 0) {
        const fillPassedCount = fillCodeTasks.filter(
          (task) => fillTaskResults[task.id]?.passed
        ).length;
        slideTestCasesTotal += fillCodeTasks.length;
        slideTestCasesPassed += fillPassedCount;
        slidePassed = slidePassed && fillPassedCount === fillCodeTasks.length;
      }

      if (theoryQuestions.length > 0) {
        const answer = testAnswer[slide.id];
        const theoryPassed = theoryQuestions.every(
          (question) => typeof answer === "number" && answer === question.correctIndex
        );
        slidePassed = slidePassed && theoryPassed;
        slideTestCasesTotal += theoryQuestions.length;
        slideTestCasesPassed += theoryPassed ? theoryQuestions.length : 0;
      }

      if (slidePassed) {
        completedTasks += 1;
      }

      results.push({
        slideId: slide.id,
        title: slide.title,
        passed: slidePassed,
        testCasesPassed: slideTestCasesPassed,
        testCasesTotal: slideTestCasesTotal,
        constraintsPassed: slideConstraintsPassed,
      });

      totalTestCases += slideTestCasesTotal;
      passedTestCases += slideTestCasesPassed;
      constraintsPassed = constraintsPassed && slideConstraintsPassed;
    });

    setLessonResults({
      results,
      totalTasks: testSlides.length,
      completedTasks,
      totalTestCases,
      passedTestCases,
      constraintsPassed,
    });
    setShowResultsModal(true);
  }, [slides, testAnswer, fillTaskResults]);

  const handleLessonComplete = useCallback(() => {
    const testSlides = slides.filter((slide) => slide.type === "test");
    const currentTestResults = testResultsRef.current;

    let allTasksSolved = true;
    const unsolvedTasks: string[] = [];

    for (const slide of testSlides) {
      const slideTestResult = currentTestResults[slide.id];
      const codeTasks = slide.blocks.filter(
        (block) => block.type === "codeTask"
      ) as CodeTaskBlock[];
      const fillCodeTasks = slide.blocks.filter(
        (block) => block.type === "fillCodeTask"
      ) as FillCodeTaskBlock[];
      const theoryQuestions = slide.blocks.filter(
        (block) => block.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      let slideSolved = codeTasks.length + fillCodeTasks.length + theoryQuestions.length > 0;

      if (codeTasks.length > 0) {
        if (!slideTestResult || !slideTestResult.allPassed) {
          slideSolved = false;
        }
      }

      if (fillCodeTasks.length > 0) {
        const allFillTasksSolved = fillCodeTasks.every((task) => fillTaskResults[task.id]?.passed);
        if (!allFillTasksSolved) {
          slideSolved = false;
        }
      }

      if (theoryQuestions.length > 0) {
        const answer = testAnswer[slide.id];
        const theoryPassed = theoryQuestions.every(
          (question) => typeof answer === "number" && answer === question.correctIndex
        );
        if (!theoryPassed) {
          slideSolved = false;
        }
      }

      if (!slideSolved) {
        allTasksSolved = false;
        unsolvedTasks.push(slide.title);
      }
    }

    if (!allTasksSolved) {
      alert(`Не все задания выполнены!\n\nНе выполнены: ${unsolvedTasks.join(", ")}`);
      return;
    }

    calculateResults();
  }, [calculateResults, slides, testAnswer, fillTaskResults]);

  const saveLesson = useCallback(async () => {
    if (!entityId) {
      setError(`ID ${entityTitle} не найден`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const lessonSlidesData = slides
        .filter((slide) => slide.type === "lesson")
        .map((slide) => ({
          ...(slide.isPersisted ? { id: slide.id } : {}),
          title: slide.title,
          type: "lesson" as const,
          orderIndex: slide.order,
          blocks: slide.blocks.map((block) => {
            if (block.type === "image") {
              const { file, ...rest } = block as any;
              return rest;
            }
            if (block.type === "fillCodeTask") {
              return normalizeFillTaskBlock(block);
            }
            return block;
          }),
        }));

      const testSlidesData = slides
        .filter((slide) => slide.type === "test")
        .map((slide) => ({
          ...(slide.isPersisted ? { id: slide.id } : {}),
          title: slide.title,
          orderIndex: slide.order,
          blocks: slide.blocks.map((block) => {
            if (block.type === "image") {
              const { file, ...rest } = block as any;
              return rest;
            }
            if (block.type === "fillCodeTask") {
              return normalizeFillTaskBlock(block);
            }
            return block;
          }),
        }));

      if (lessonDetailsId) {
        await LessonDetailsService.updateLessonDetails(lessonDetailsId, {
          slides: isCheckpointMode ? [] : lessonSlidesData,
          tests: testSlidesData,
        });
      } else {
        const response = await LessonDetailsService.createLessonDetails({
          ...(isCheckpointMode ? { checkpointId: entityId } : { lessonId: entityId }),
          slides: isCheckpointMode ? [] : lessonSlidesData,
          tests: testSlidesData,
        });
        setLessonDetailsId(response.id);
      }

      await loadLessonDetails();

      alert(`${entityDisplayTitle} успешно сохранен${isCheckpointMode ? "а" : ""}!`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || `Ошибка сохранения ${entityTitle}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    entityDisplayTitle,
    entityId,
    entityTitle,
    isCheckpointMode,
    lessonDetailsId,
    loadLessonDetails,
    slides,
  ]);

  const reviewModalSlide =
    reviewModalBlock != null ? (slides[reviewModalBlock.slideIndex] ?? null) : null;
  const reviewListSlide =
    reviewListBlock != null ? (slides[reviewListBlock.slideIndex] ?? null) : null;
  const reviewListReviews =
    reviewListSlide != null && reviewListBlock != null
      ? getReviewsForBlock(reviewListSlide, reviewListBlock.blockId)
      : [];
  const selectedSlideHasTaskBlock =
    selectedSlide?.type === "test" &&
    selectedSlide.blocks.some((block) => TEST_TASK_BLOCK_TYPES.includes(block.type));

  if (isLoading) {
    return (
      <section className={styles.lesson}>
        <div className={styles.lesson__container}>
          <h1 className={styles.lesson__title}>Загрузка {entityTitle}...</h1>
        </div>
      </section>
    );
  }

  if (previewMode) {
    const orderedSlides = [...slides].sort((first, second) => first.order - second.order);
    const currentSlide = orderedSlides[previewCurrentIndex];

    if (!currentSlide) {
      return (
        <section className={styles.lesson}>
          <div className={styles.lesson__container}>
            <h1 className={styles.lesson__title}>Превью {entityTitle}</h1>
            <p>Нет слайдов.</p>
            <Button
              color="#9F0FA7"
              width="200px"
              textColor="#fff"
              text="Выйти из превью"
              onClick={() => setPreviewMode(false)}
            />
          </div>
        </section>
      );
    }

    const goNext = () => {
      if (previewCurrentIndex < orderedSlides.length - 1) {
        setPreviewCurrentIndex((index) => index + 1);
      } else {
        handleLessonComplete();
      }
    };

    const goPrev = () => {
      if (previewCurrentIndex > 0) {
        setPreviewCurrentIndex((index) => index - 1);
      }
    };

    const slideSources = currentSlide.blocks
      .filter((block): block is SourceBlock => block.type === "source")
      .map((block) => ({ url: block.url, note: block.note }));

    return (
      <section className={styles.lesson}>
        <div className={styles.lesson__container}>
          <div className={styles.previewTop}>
            <h1 className={styles.lesson__title}>Превью: {currentSlide.title}</h1>
            <div className={styles.previewTopActions}>
              {slideSources.length > 0 && (
                <Button
                  color="#9F0FA7"
                  width="40px"
                  textColor="#fff"
                  text="?"
                  onClick={() => openSourcesModal(slideSources)}
                />
              )}
              <Button
                color="#9F0FA7"
                width="200px"
                textColor="#fff"
                text="Выйти из превью"
                onClick={() => setPreviewMode(false)}
              />
            </div>
          </div>

          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              <h3 className={styles.preview__subtitle}>{currentSlide.title}</h3>
              {sortBlocks(currentSlide.blocks).map((block) => (
                <PreviewBlock
                  key={block.id}
                  block={block}
                  slideId={currentSlide.id}
                  runCode={runCode}
                  codeRunOutput={codeRunOutput[block.id]}
                  codeRunLoading={codeRunLoading[block.id]}
                  testAnswer={testAnswer[currentSlide.id]}
                  setTestAnswer={(value) =>
                    setTestAnswer((prev) => ({ ...prev, [currentSlide.id]: value }))
                  }
                  fillAnswers={fillTaskAnswers[block.id] ?? {}}
                  setFillAnswers={(values) => {
                    setFillTaskAnswers((prev) => ({ ...prev, [block.id]: values }));
                    setFillTaskErrors((prev) => ({ ...prev, [block.id]: "" }));
                    setFillTaskResults((prev) => {
                      const next = { ...prev };
                      delete next[block.id];
                      return next;
                    });
                  }}
                  testError={
                    block.type === "fillCodeTask"
                      ? fillTaskErrors[block.id]
                      : testError[currentSlide.id]
                  }
                  setTestError={(value) => {
                    if (block.type === "fillCodeTask") {
                      setFillTaskErrors((prev) => ({ ...prev, [block.id]: value }));
                      return;
                    }
                    setTestError((prev) => ({ ...prev, [currentSlide.id]: value }));
                  }}
                  onCorrect={goNext}
                  onResults={(results) => {
                    setTestResults((prev) => {
                      const next = { ...prev, [currentSlide.id]: results };
                      testResultsRef.current = next;
                      return next;
                    });
                  }}
                  onFillTaskResult={(result) => {
                    setFillTaskResults((prev) => ({
                      ...prev,
                      [block.id]: result,
                    }));
                  }}
                />
              ))}
            </div>
          </div>

          <div className={styles.previewNav}>
            <span>
              {previewCurrentIndex + 1} / {orderedSlides.length}
            </span>
            <Button
              color="#9F0FA7"
              width="120px"
              textColor="#fff"
              text="Назад"
              onClick={goPrev}
              disabled={previewCurrentIndex === 0}
            />
            <Button
              color="#9F0FA7"
              width="120px"
              textColor="#fff"
              text={previewCurrentIndex === orderedSlides.length - 1 ? "Завершить" : "Вперёд"}
              onClick={goNext}
            />
          </div>
        </div>

        <SourceModal
          isOpen={sourceModalOpen}
          onClose={() => setSourceModalOpen(false)}
          sources={currentSources}
        />
        <ResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setPreviewMode(false);
          }}
          title={isCheckpointMode ? "Результаты контрольной точки" : "Результаты урока"}
          results={lessonResults.results}
          totalTasks={lessonResults.totalTasks}
          completedTasks={lessonResults.completedTasks}
          totalTestCases={lessonResults.totalTestCases}
          passedTestCases={lessonResults.passedTestCases}
          constraintsPassed={lessonResults.constraintsPassed}
          slides={slides}
        />
      </section>
    );
  }

  return (
    <section className={styles.lesson}>
      <div className={styles.lesson__container}>
        <h1 className={styles.lesson__title}>
          {isCheckpointMode ? "Редактирование контрольной точки" : "Редактирование урока"}
        </h1>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className={styles.slideActions}>
          {!isCheckpointMode && (
            <Button
              color="#9F0FA7"
              width="180px"
              textColor="#fff"
              text="Слайд (урок)"
              onClick={() => addSlide("lesson")}
            />
          )}
          <Button
            color="#6a0f6e"
            width="180px"
            textColor="#fff"
            text={isCheckpointMode ? "Добавить задание" : "Слайд (тест)"}
            onClick={() => addSlide("test")}
          />
        </div>

        {slides.length > 0 && (
          <div className={styles.slideTabs}>
            {slides.map((slide, index) => (
              <div key={slide.id} className={styles.slideTabWrapper}>
                <button
                  type="button"
                  className={selectedSlideIndex === index ? styles.slideTabActive : styles.slideTab}
                  onClick={() => setSelectedSlideIndex(index)}
                >
                  {slide.type === "test"
                    ? isCheckpointMode
                      ? "Задание"
                      : "Тест"
                    : "Урок"}{" "}
                  {index + 1}: {slide.title || "—"}
                </button>
                <button
                  type="button"
                  className={styles.slideTabDelete}
                  onClick={() => deleteSlide(index)}
                  title="Удалить слайд"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedSlide && selectedSlideIndex !== null && (
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.form__content}>
              <div className={styles.form__panel}>
                <label className={styles.form__label}>Название слайда</label>
                <input
                  className={styles.form__input}
                  value={selectedSlide.title}
                  onChange={(e) => updateSlide(selectedSlideIndex, { title: e.target.value })}
                  placeholder="Введите название"
                />
              </div>

              {!isCheckpointMode && (
                <div className={styles.form__panel}>
                  <label className={styles.form__label}>Тип слайда</label>
                  <select
                    value={selectedSlide.type}
                    onChange={(e) =>
                      updateSlide(selectedSlideIndex, { type: e.target.value as SlideType })
                    }
                  >
                    <option value="lesson">Урок</option>
                    <option value="test">Тест</option>
                  </select>
                </div>
              )}

              {selectedSlide.type === "lesson" && (
                <div className={styles.blockAddRow}>
                  <span className={styles.form__label}>Добавить блок:</span>
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Текст"
                    onClick={() => addBlock(selectedSlideIndex, "text")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Код (пример)"
                    onClick={() => addBlock(selectedSlideIndex, "codeExample")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Источник"
                    onClick={() => addBlock(selectedSlideIndex, "source")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Таблица"
                    onClick={() => addBlock(selectedSlideIndex, "table")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Изображение"
                    onClick={() => addBlock(selectedSlideIndex, "image")}
                  />
                </div>
              )}

              {selectedSlide.type === "test" && (
                <>
                  <div className={styles.blockAddRow}>
                    <span className={styles.form__label}>Добавить блок:</span>
                    <Button
                      color="#9F0FA7"
                      width="auto"
                      textColor="#fff"
                      text="Текст"
                      onClick={() => addBlock(selectedSlideIndex, "text")}
                    />
                    <Button
                      color="#9F0FA7"
                      width="auto"
                      textColor="#fff"
                      text="Задача с кодом"
                      onClick={() => addBlock(selectedSlideIndex, "codeTask")}
                      disabled={selectedSlideHasTaskBlock}
                    />
                    <Button
                      color="#9F0FA7"
                      width="auto"
                      textColor="#fff"
                      text="Дописать код"
                      onClick={() => addBlock(selectedSlideIndex, "fillCodeTask")}
                      disabled={selectedSlideHasTaskBlock}
                    />
                    <Button
                      color="#9F0FA7"
                      width="auto"
                      textColor="#fff"
                      text="Теор. вопрос"
                      onClick={() => addBlock(selectedSlideIndex, "theoryQuestion")}
                      disabled={selectedSlideHasTaskBlock}
                    />
                  </div>
                  {selectedSlideHasTaskBlock && (
                    <p className={styles.reviewItemComment}>
                      На тестовом слайде допускается только одно задание. Текстовые блоки можно
                      добавлять отдельно.
                    </p>
                  )}
                </>
              )}

              <div className={styles.blocksList}>
                <label className={styles.form__label}>Блоки (порядок можно менять)</label>
                {!selectedSlide.isPersisted && (
                  <p className={styles.reviewItemComment}>
                    Для новых слайдов кнопка review станет доступна после сохранения{" "}
                    {isCheckpointMode ? "контрольной точки" : "урока"}.
                  </p>
                )}
                {sortBlocks(selectedSlide.blocks).map((block, index) => {
                  const reviews = getReviewsForBlock(selectedSlide, block.id);
                  const pendingReviews = reviews.filter(
                    (review) => review.status === ReviewStatus.PENDING
                  );

                  return (
                    <div key={block.id} className={styles.blockCard}>
                      <div className={styles.blockCard__toolbar}>
                        <span className={styles.blockCard__type}>{block.type}</span>
                        <button
                          type="button"
                          onClick={() => moveBlock(selectedSlideIndex, block.id, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(selectedSlideIndex, block.id, "down")}
                          disabled={index === selectedSlide.blocks.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={styles.reviewButton}
                          onClick={() => openReviewModal(selectedSlideIndex, block.id)}
                          disabled={!selectedSlide.isPersisted || !reviewerInfo}
                          title={
                            !selectedSlide.isPersisted
                              ? `Сначала сохраните ${isCheckpointMode ? "контрольную точку" : "урок"}`
                              : !reviewerInfo
                                ? "Не удалось определить текущего пользователя"
                                : "Предложить изменение для блока"
                          }
                        >
                          {pendingReviews.length > 0
                            ? `Review (${pendingReviews.length})`
                            : "Review"}
                        </button>
                        {selectedSlide.isPersisted &&
                          (reviews.length > 0 || reviewsLoading[selectedSlide.id]) && (
                            <button
                              type="button"
                              className={styles.reviewListButton}
                              onClick={() => openReviewListModal(selectedSlideIndex, block.id)}
                              disabled={reviewsLoading[selectedSlide.id]}
                            >
                              {reviewsLoading[selectedSlide.id]
                                ? "Загрузка..."
                                : `Правки (${reviews.length})`}
                            </button>
                          )}
                        <button
                          type="button"
                          className={styles.blockCard__del}
                          onClick={() => deleteBlock(selectedSlideIndex, block.id)}
                        >
                          Удалить
                        </button>
                      </div>
                      <BlockEditor
                        key={`${block.id}_${block.order}`}
                        block={block}
                        slideIndex={selectedSlideIndex}
                        updateBlock={updateBlock}
                        onImageUpload={handleImageUpload}
                        runCode={runCode}
                        codeRunOutput={codeRunOutput[block.id]}
                        codeRunLoading={codeRunLoading[block.id]}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        )}

        <div className={styles.preview}>
          <h2 className={styles.preview__title}>Превью текущего слайда</h2>
          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              {slides.length === 0 ? (
                <p>Добавьте слайды</p>
              ) : selectedSlide ? (
                sortBlocks(selectedSlide.blocks ?? []).map((block) => (
                  <PreviewBlockStatic key={block.id} block={block} />
                ))
              ) : (
                <p>Выберите слайд для предпросмотра</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            color="#9F0FA7"
            width="200px"
            textColor="#fff"
            text="Открыть превью"
            onClick={() => {
              setPreviewCurrentIndex(0);
              setPreviewMode(true);
            }}
          />
          <Button
            color="#9F0FA7"
            width="200px"
            textColor="#fff"
            text={isSaving ? "Сохранение..." : "Сохранить изменения"}
            onClick={saveLesson}
            disabled={isSaving}
          />
        </div>

        <BlockReviewModal
          isOpen={reviewModalBlock != null && reviewDraftBlock != null}
          block={reviewDraftBlock}
          slideTitle={reviewModalSlide?.title || "Без названия"}
          comment={reviewComment}
          onCommentChange={setReviewComment}
          onBlockChange={handleReviewDraftChange}
          onImageUpload={handleReviewDraftImageUpload}
          onClose={closeReviewModal}
          onSubmit={submitReview}
          isSubmitting={isSubmittingReview}
          runCode={runCode}
          codeRunOutput={reviewDraftBlock ? codeRunOutput[reviewDraftBlock.id] : undefined}
          codeRunLoading={reviewDraftBlock ? codeRunLoading[reviewDraftBlock.id] : undefined}
        />
        <BlockReviewsModal
          isOpen={reviewListBlock != null}
          slideTitle={reviewListSlide?.title || "Без названия"}
          reviews={reviewListReviews}
          actionLoading={reviewActionLoading}
          onAccept={(review) => {
            if (!reviewListBlock) {
              return;
            }

            handleReviewDecision(
              reviewListBlock.slideIndex,
              reviewListBlock.blockId,
              review,
              "accept"
            );
          }}
          onReject={(review) => {
            if (!reviewListBlock) {
              return;
            }

            handleReviewDecision(
              reviewListBlock.slideIndex,
              reviewListBlock.blockId,
              review,
              "reject"
            );
          }}
          onClose={closeReviewListModal}
        />
      </div>
    </section>
  );
}
