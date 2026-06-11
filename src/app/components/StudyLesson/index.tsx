"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "../Button";

import styles from "./index.module.scss";

import {
  addJavaMainMethod,
  extractFunctionName,
} from "@/app/components/EditLesson/codeUtils";
import { sortBlocks } from "@/app/components/EditLesson/editorShared";
import { normalizeFillTaskBlock } from "@/app/components/EditLesson/fillTaskUtils";
import { SourceModal } from "@/app/components/EditLesson/modals";
import { PreviewBlock } from "@/app/components/EditLesson/PreviewBlocks";
import LessonCommentsModal from "@/app/components/StudyLesson/LessonCommentsModal";
import type {
  CodeTaskBlock,
  FillCodeTaskBlock,
  Slide,
  SourceBlock,
  TheoryQuestionBlock,
} from "@/app/components/EditLesson/types";
import { CheckpointService } from "@/app/http/checkpointService";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import { LessonDetailsService } from "@/app/http/lessonDetailsService";
import { LessonService } from "@/app/http/lessonService";
import { ProfileService } from "@/app/http/profile";

interface StudyLessonProps {
  courseId: string;
  lessonId?: string;
  checkpointId?: string;
  mode?: "lesson" | "checkpoint";
}

interface CodeTaskResultSummary {
  testResults: Array<{ passed: boolean }>;
  constraintResults: Array<{ passed: boolean }>;
  passedTests: number;
  totalTests: number;
  allPassed: boolean;
  constraintsPassed: boolean;
}

interface LessonResultsSummary {
  results: Array<{
    id: string;
    slideId: string;
    slideTitle: string;
    title: string;
    taskNumber: number;
    passed: boolean;
    kind: "code" | "fill" | "theory";
    testCasesPassed?: number;
    testCasesTotal?: number;
    constraintsPassed?: boolean;
  }>;
  totalTasks: number;
  completedTasks: number;
  totalTestCases: number;
  passedTestCases: number;
  constraintsPassed: boolean;
  stars: number;
}

const defaultLessonResults: LessonResultsSummary = {
  results: [],
  totalTasks: 0,
  completedTasks: 0,
  totalTestCases: 0,
  passedTestCases: 0,
  constraintsPassed: true,
  stars: 0,
};

const getUserId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("userId");
};

const StudyLesson = ({
  courseId,
  lessonId,
  checkpointId,
  mode = "lesson",
}: StudyLessonProps) => {
  const router = useRouter();
  const isCheckpointMode = mode === "checkpoint";
  const entityId = isCheckpointMode ? checkpointId : lessonId;
  const entityTitle = isCheckpointMode ? "Контрольная точка" : "Урок";
  const entityTitleLower = isCheckpointMode ? "контрольная точка" : "урок";
  const entityTitleGenitive = isCheckpointMode ? "контрольной точки" : "урока";

  const [lessonTitle, setLessonTitle] = useState(entityTitle);
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonDetailsId, setLessonDetailsId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<{ url: string; note?: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [codeRunOutput, setCodeRunOutput] = useState<Record<string, string>>({});
  const [codeRunLoading, setCodeRunLoading] = useState<Record<string, boolean>>({});
  const [testAnswer, setTestAnswer] = useState<Record<string, string | number>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [fillTaskAnswers, setFillTaskAnswers] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [fillTaskErrors, setFillTaskErrors] = useState<Record<string, string>>({});
  const [fillTaskResults, setFillTaskResults] = useState<
    Record<string, { passed: boolean; matchedCaseIndex: number | null; totalCases: number }>
  >({});
  const [codeTaskResults, setCodeTaskResults] = useState<
    Record<string, CodeTaskResultSummary>
  >({});
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [lessonResults, setLessonResults] =
    useState<LessonResultsSummary>(defaultLessonResults);
  const [resultSaveError, setResultSaveError] = useState<string | null>(null);
  const [animatingStars, setAnimatingStars] = useState<number[]>([]);
  const [showStars, setShowStars] = useState(false);

  const loadLessonDetails = useCallback(async () => {
    if (!entityId) {
      setError(`${entityTitle} не найден${isCheckpointMode ? "а" : ""}.`);
      setLoading(false);

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [lessonDetails, lessonMeta] = await Promise.all([
        isCheckpointMode
          ? LessonDetailsService.getLessonDetailsByCheckpointId(entityId)
          : LessonDetailsService.getLessonDetailsByLessonId(entityId),
        isCheckpointMode
          ? CheckpointService.getCheckpoint(entityId).catch(() => null)
          : LessonService.getLesson(entityId).catch(() => null),
      ]);

      setLessonDetailsId(lessonDetails.id);

      if (lessonMeta) {
        setLessonTitle(lessonMeta.title || entityTitle);
        setLessonDescription(lessonMeta.description || "");
      } else {
        setLessonTitle(entityTitle);
        setLessonDescription("");
      }

      const normalizeBlocks = (blocks: unknown): Slide["blocks"] => {
        if (!Array.isArray(blocks)) {
          return [];
        }

        return blocks.map((block) => {
          if ((block as { type?: string }).type === "fillCodeTask") {
            return normalizeFillTaskBlock(block as FillCodeTaskBlock);
          }

          return block as Slide["blocks"][number];
        });
      };

      const nextSlides: Slide[] = [];

      if (!isCheckpointMode && Array.isArray(lessonDetails.slides)) {
        lessonDetails.slides.forEach((slide, index) => {
          nextSlides.push({
            id: slide.id || `slide_${index}`,
            title: slide.title || entityTitle,
            type: "lesson",
            order: slide.orderIndex || index,
            blocks: normalizeBlocks(slide.blocks),
          });
        });
      }

      if (Array.isArray(lessonDetails.tests)) {
        lessonDetails.tests.forEach((slide, index) => {
          nextSlides.push({
            id: slide.id || `test_${index}`,
            title: slide.title || "Тест",
            type: "test",
            order:
              slide.orderIndex || (lessonDetails.slides?.length || 0) + index,
            blocks: normalizeBlocks(slide.blocks),
          });
        });
      }

      nextSlides.sort((left, right) => left.order - right.order);

      if (nextSlides.length === 0) {
        setError(
          isCheckpointMode
            ? "В контрольной точке пока нет заданий."
            : "В уроке пока нет слайдов."
        );
        setSlides([]);
      } else {
        setSlides(nextSlides);
        setCurrentIndex(0);
      }
    } catch (loadError: unknown) {
      console.error(
        `Ошибка загрузки ${isCheckpointMode ? "контрольной точки" : "урока"}:`,
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : `Не удалось загрузить ${entityTitleLower}.`
      );
    } finally {
      setLoading(false);
    }
  }, [entityId, entityTitle, entityTitleLower, isCheckpointMode]);

  useEffect(() => {
    void loadLessonDetails();
  }, [loadLessonDetails]);

  useEffect(() => {
    setCurrentUserId(getUserId());
  }, []);

  const orderedSlides = useMemo(
    () => [...slides].sort((left, right) => left.order - right.order),
    [slides]
  );
  const currentSlide = orderedSlides[currentIndex];

  const openSourcesModal = useCallback((sources: { url: string; note?: string }[]) => {
    setCurrentSources(sources);
    setSourcesModalOpen(true);
  }, []);

  const currentSlideSources = useMemo(() => {
    if (!currentSlide) {
      return [];
    }

    return sortBlocks(currentSlide.blocks)
      .filter((block): block is SourceBlock => block.type === "source")
      .map((block) => ({ url: block.url, note: block.note }));
  }, [currentSlide]);

  const runCode = useCallback(async (blockId: string, language: CodeLanguage, code: string) => {
    setCodeRunLoading((prev) => ({ ...prev, [blockId]: true }));
    setCodeRunOutput((prev) => ({ ...prev, [blockId]: "" }));

    try {
      let codeToRun = code;

      if (language === "java") {
        const functionName = extractFunctionName(code, language);

        if (functionName) {
          codeToRun = addJavaMainMethod(code, functionName, "5");
        }
      }

      const response = await CodeService.executeCode({
        language,
        code: codeToRun,
      });

      const output = response.error ? `Ошибка: ${response.error}` : response.output || "";

      setCodeRunOutput((prev) => ({ ...prev, [blockId]: output }));
    } catch (executionError) {
      setCodeRunOutput((prev) => ({
        ...prev,
        [blockId]: `Ошибка: ${String(executionError)}`,
      }));
    } finally {
      setCodeRunLoading((prev) => ({ ...prev, [blockId]: false }));
    }
  }, []);

  const saveLessonResult = useCallback(
    async (stars: number) => {
      const userId = getUserId();

      if (!userId || !entityId) {
        return true;
      }

      try {
        await ProfileService.createStudentResult({
          clientId: userId,
          ...(isCheckpointMode ? { checkpointId: entityId } : { lessonId: entityId }),
          countOfStars: stars,
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("course-progress-updated", {
              detail: { courseId },
            }),
          );
        }

        return true;
      } catch (saveError) {
        console.error(`Ошибка сохранения результата ${entityTitleGenitive}:`, saveError);

        return false;
      }
    },
    [courseId, entityId, entityTitleGenitive, isCheckpointMode]
  );

  const calculateResults = useCallback(async () => {
    const testSlides = orderedSlides.filter((slide) => slide.type === "test");
    const results: LessonResultsSummary["results"] = [];

    let totalCodeTasks = 0;
    let passedCodeTasks = 0;
    let totalFillTasks = 0;
    let passedFillTasks = 0;
    let totalTheoryQuestions = 0;
    let correctTheoryAnswers = 0;
    let allConstraintsPassed = true;
    let taskNumber = 0;

    testSlides.forEach((slide) => {
      const slideCodeResult = codeTaskResults[slide.id];
      const codeTasks = slide.blocks.filter(
        (block) => block.type === "codeTask"
      ) as CodeTaskBlock[];
      const fillCodeTasks = slide.blocks.filter(
        (block) => block.type === "fillCodeTask"
      ) as FillCodeTaskBlock[];
      const theoryQuestions = slide.blocks.filter(
        (block) => block.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      let slideCodePassed = true;
      let slideTestCasesPassed = 0;
      let slideTestCasesTotal = 0;

      if (codeTasks.length > 0) {
        totalCodeTasks += codeTasks.length;

        if (slideCodeResult) {
          slideTestCasesPassed = slideCodeResult.passedTests || 0;
          slideTestCasesTotal = slideCodeResult.totalTests || 0;
          slideCodePassed =
            slideTestCasesPassed === slideTestCasesTotal && slideTestCasesTotal > 0;

          if (slideCodePassed) {
            passedCodeTasks += codeTasks.length;
          }
        } else {
          slideCodePassed = false;
        }
      }

      if (fillCodeTasks.length > 0) {
        totalFillTasks += fillCodeTasks.length;

        const passedFillOnSlide = fillCodeTasks.filter(
          (task) => fillTaskResults[task.id]?.passed
        ).length;

        passedFillTasks += passedFillOnSlide;
        slideTestCasesPassed += passedFillOnSlide;
        slideTestCasesTotal += fillCodeTasks.length;
      }

      if (theoryQuestions.length > 0) {
        totalTheoryQuestions += theoryQuestions.length;

        const theoryCorrectCount = theoryQuestions.filter(
          (question) =>
            typeof testAnswer[question.id] === "number" &&
            testAnswer[question.id] === question.correctIndex,
        ).length;

        correctTheoryAnswers += theoryCorrectCount;
      }

      const slideConstraintsPassed =
        slideCodeResult?.constraintResults?.every((constraint) => constraint.passed) ?? true;

      allConstraintsPassed = allConstraintsPassed && slideConstraintsPassed;

      sortBlocks(slide.blocks).forEach((block) => {
        if (block.type === "codeTask") {
          taskNumber += 1;
          results.push({
            id: `${slide.id}-${block.id}`,
            slideId: slide.id,
            slideTitle: slide.title,
            title: "Кодовая задача",
            taskNumber,
            passed: slideCodePassed,
            kind: "code",
            testCasesPassed: slideTestCasesPassed,
            testCasesTotal: slideTestCasesTotal,
            constraintsPassed: slideConstraintsPassed,
          });
        }

        if (block.type === "fillCodeTask") {
          taskNumber += 1;
          results.push({
            id: `${slide.id}-${block.id}`,
            slideId: slide.id,
            slideTitle: slide.title,
            title: "Задание с вставкой кода",
            taskNumber,
            passed: Boolean(fillTaskResults[block.id]?.passed),
            kind: "fill",
          });
        }

        if (block.type === "theoryQuestion") {
          taskNumber += 1;
          results.push({
            id: `${slide.id}-${block.id}`,
            slideId: slide.id,
            slideTitle: slide.title,
            title: "Задание с выбором ответа",
            taskNumber,
            passed:
              typeof testAnswer[block.id] === "number" &&
              testAnswer[block.id] === block.correctIndex,
            kind: "theory",
          });
        }
      });
    });

    const totalTasks = totalCodeTasks + totalFillTasks + totalTheoryQuestions;
    const completedTasks = passedCodeTasks + passedFillTasks + correctTheoryAnswers;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const totalPracticeTasks = totalCodeTasks + totalFillTasks;
    const passedPracticeTasks = passedCodeTasks + passedFillTasks;
    const allPracticeTasksPassed =
      totalPracticeTasks === 0 || passedPracticeTasks === totalPracticeTasks;

    let stars = 0;

    if (!allPracticeTasksPassed) {
      stars = 0;
    } else if (completionPercentage < 50) {
      stars = 1;
    } else if (completionPercentage >= 50 && completionPercentage < 100) {
      stars = 2;
    } else if (completionPercentage === 100 && allConstraintsPassed) {
      stars = 3;
    } else if (completionPercentage === 100 && !allConstraintsPassed) {
      stars = 2;
    }

    const summary: LessonResultsSummary = {
      results,
      totalTasks,
      completedTasks,
      totalTestCases:
        Object.values(codeTaskResults).reduce(
          (sum, result) => sum + result.totalTests,
          0
        ) + totalFillTasks,
      passedTestCases:
        Object.values(codeTaskResults).reduce(
          (sum, result) => sum + result.passedTests,
          0
        ) + passedFillTasks,
      constraintsPassed: allConstraintsPassed,
      stars,
    };

    setLessonResults(summary);

    const isSaved = await saveLessonResult(stars);

    setResultSaveError(
      isSaved ? null : `Не удалось сохранить результат ${entityTitleGenitive}.`
    );
    setResultsModalOpen(true);
  }, [
    codeTaskResults,
    entityTitleGenitive,
    fillTaskResults,
    orderedSlides,
    saveLessonResult,
    testAnswer,
  ]);

  const retrySaveResult = useCallback(async () => {
    const isSaved = await saveLessonResult(lessonResults.stars);

    setResultSaveError(
      isSaved ? null : `Не удалось сохранить результат ${entityTitleGenitive}.`
    );
  }, [entityTitleGenitive, lessonResults.stars, saveLessonResult]);

  const goToNext = useCallback(() => {
    if (currentIndex < orderedSlides.length - 1) {
      setCurrentIndex((prev) => prev + 1);

      return;
    }

    void calculateResults();
  }, [calculateResults, currentIndex, orderedSlides.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!resultsModalOpen) {
      setAnimatingStars([]);
      setShowStars(false);

      return;
    }

    setAnimatingStars([]);
    setShowStars(false);

    const startTimer = window.setTimeout(() => {
      setShowStars(true);

      [0, 1, 2].forEach((index) => {
        if (index >= lessonResults.stars) {
          return;
        }

        window.setTimeout(() => {
          setAnimatingStars((prev) => [...prev, index]);
        }, index * 600);
      });
    }, 300);

    return () => {
      window.clearTimeout(startTimer);
    };
  }, [lessonResults.stars, resultsModalOpen]);

  if (loading) {
    return <div className={styles.state}>Загрузка {entityTitleGenitive}...</div>;
  }

  if (error || !currentSlide) {
    return (
      <div className={styles.state}>
        <p>{error || `${entityTitle} не найден${isCheckpointMode ? "а" : ""}.`}</p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push(`/study/${courseId}/map`)}
          >
            К карте курса
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void loadLessonDetails()}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageInner}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
        

            <div className={styles.titleBlock}>
              
              <h1 className={styles.title}>{lessonTitle}</h1>
              {lessonDescription ? (
                <p className={styles.description}>{lessonDescription}</p>
              ) : null}
            </div>
          </div>

          <div className={styles.progressBadge}>{currentIndex + 1} / {orderedSlides.length}</div>
        </div>

        <div className={styles.surface}>
          <div className={styles.surfaceTop}>
            <aside className={styles.sideRail}>
              <button
                type="button"
                className={styles.sideRailButton}
                onClick={() => openSourcesModal(currentSlideSources)}
              >
                Источники
              </button>
              <button
                type="button"
                className={styles.sideRailButton}
                onClick={() => setCommentsModalOpen(true)}
              >
                Комментарии
              </button>
            </aside>
          </div>

          <div className={styles.content}>
            {sortBlocks(currentSlide.blocks).map((block) => (
              <PreviewBlock
                key={block.id}
                block={block}
                slideId={currentSlide.id}
                runCode={runCode}
                codeRunOutput={codeRunOutput[block.id]}
                codeRunLoading={codeRunLoading[block.id]}
                testAnswer={testAnswer[block.id]}
                setTestAnswer={(value) =>
                  setTestAnswer((prev) => ({ ...prev, [block.id]: value }))
                }
                onAdvanceNext={goToNext}
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
                    : testErrors[block.id]
                }
                setTestError={(value) => {
                  if (block.type === "fillCodeTask") {
                    setFillTaskErrors((prev) => ({ ...prev, [block.id]: value }));

                    return;
                  }

                  setTestErrors((prev) => ({ ...prev, [currentSlide.id]: value }));
                }}
                onCorrect={() => {}}
                onResults={(results) => {
                  setCodeTaskResults((prev) => ({
                    ...prev,
                    [currentSlide.id]: results as CodeTaskResultSummary,
                  }));
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
          <div className={styles.previewCounter}>
            {currentIndex + 1} / {orderedSlides.length}
          </div>
          <div className={styles.navigation}>
            <Button
              color="#9F0FA7"
              width="200px"
              textColor="#fff"
              text="Назад"
              onClick={goToPrev}
              disabled={currentIndex === 0}
            />
            <Button
              color="#9F0FA7"
              width="200px"
              textColor="#fff"
              text={
                currentIndex === orderedSlides.length - 1
                  ? isCheckpointMode
                    ? "Завершить контрольную точку"
                    : "Завершить урок"
                  : "Вперёд"
              }
              onClick={goToNext}
            />
          </div>
        </div>
      </div>

      <SourceModal
        isOpen={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
        sources={currentSources}
      />

      <LessonCommentsModal
        isOpen={commentsModalOpen}
        lessonDetailsId={lessonDetailsId}
        currentUserId={currentUserId}
        onClose={() => setCommentsModalOpen(false)}
      />

      {resultsModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setResultsModalOpen(false)}>
          <div className={styles.resultsCard} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setResultsModalOpen(false)}
            >
              ×
            </button>
 
            <h2 className={styles.modalTitle}>
              {isCheckpointMode ? "Контрольная точка завершена" : "Урок завершён"}
            </h2>

            <div className={styles.starsContainer}>
              {showStars &&
                [0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className={`${styles.starWrapper} ${
                      animatingStars.includes(index) ? styles.starFalling : ""
                    } ${index < lessonResults.stars ? styles.starVisible : styles.starHidden}`}
                    style={{
                      animationDelay: `${index * 0.2}s`,
                      left: `${30 + index * 20}%`,
                    }}
                  >
                    <span
                      className={`${styles.star} ${
                        index < lessonResults.stars ? styles.starFilled : ""
                      }`}
                    >
                      ★
                    </span>
                  </div>
                ))}
            </div>

            <div className={styles.resultsSummary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Выполнено заданий:</span>
                <span className={styles.summaryValue}>
                  {lessonResults.completedTasks}/{lessonResults.totalTasks}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Пройдено тестов:</span>
                <span className={styles.summaryValue}>
                  {lessonResults.passedTestCases}/{lessonResults.totalTestCases}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Ограничения:</span>
                <span className={styles.summaryValue}>
                  {lessonResults.constraintsPassed ? "Пройдены" : "Не пройдены"}
                </span>
              </div>
            </div>

            <div className={styles.resultsList}>
              <h4>Детали по заданиям:</h4>
              {lessonResults.results.map((result) => (
                <div
                  key={result.id}
                  className={`${styles.resultItem} ${
                    result.passed ? styles.resultPassed : styles.resultFailed
                  }`}
                >
                  <div className={styles.resultTitle}>
                    {result.taskNumber}. {result.title}
                  </div>
                  <div className={styles.resultSubtitle}>{result.slideTitle}</div>
                  <div className={styles.resultDetails}>
                    <span>
                      Статус: {result.passed ? "Выполнено" : "Не выполнено"}
                    </span>
                    {result.kind === "code" ? (
                      <>
                        <span>
                          Тесты: {result.testCasesPassed ?? 0}/{result.testCasesTotal ?? 0}
                        </span>
                        <span className={styles.resultDetailLine}>
                          Ограничения: {result.constraintsPassed ? "Пройдены" : "Провалены"}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {resultSaveError ? (
              <div className={styles.saveWarning}>
                <span>{resultSaveError}</span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void retrySaveResult()}
                >
                  Сохранить ещё раз
                </button>
              </div>
            ) : null}

            <div className={styles.modalActions}>
              <Button
                color="#9F0FA7"
                width="200px"
                textColor="#fff"
                text="Закрыть"
                onClick={() => setResultsModalOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default StudyLesson;
