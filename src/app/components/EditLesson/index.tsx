"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import Button from "../Button";

import { BlockEditor } from "./BlockEditor";
import {
  createCodeExampleBlock,
  createCodeTaskBlock,
  createImageBlock,
  createSourceBlock,
  createTableBlock,
  createTextBlock,
  createTheoryQuestionBlock,
  genId,
} from "./blockFactories";
import { sortBlocks } from "./editorShared";
import styles from "./index.module.scss";
import { ResultsModal, SourceModal } from "./modals";
import { PreviewBlock, PreviewBlockStatic } from "./PreviewBlocks";
import type {
  CodeTaskBlock,
  Slide,
  SlideBlock,
  SlideType,
  SourceBlock,
  TheoryQuestionBlock,
} from "./types";

import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import { LessonDetailsService } from "@/app/http/lessonDetailsService";

/* eslint-disable */

export default function EditLesson() {
  const params = useParams();
  const lessonId = params?.id as string;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState<Record<string, string | number>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [codeRunOutput, setCodeRunOutput] = useState<Record<string, string>>({});
  const [codeRunLoading, setCodeRunLoading] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetailsId, setLessonDetailsId] = useState<string | null>(null);
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

  const loadLessonDetails = useCallback(async () => {
    if (!lessonId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await LessonDetailsService.getLessonDetailsByLessonId(lessonId);
      setLessonDetailsId(data.id);

      const allSlides: Slide[] = [
        ...data.slides.map((slide) => ({
          id: slide.id,
          title: slide.title,
          type: slide.type as SlideType,
          order: slide.orderIndex,
          blocks: (slide.blocks || []) as unknown as SlideBlock[],
        })),
        ...data.tests.map((test) => ({
          id: test.id,
          title: test.title,
          type: "test" as const,
          order: test.orderIndex,
          blocks: (test.blocks || []) as unknown as SlideBlock[],
        })),
      ].sort((first, second) => first.order - second.order);

      setSlides(allSlides);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSlides([]);
        setLessonDetailsId(null);
      } else {
        setError(err.message || "Ошибка загрузки урока");
        console.error("Error loading lesson details:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLessonDetails();
  }, [loadLessonDetails]);

  const selectedSlide = selectedSlideIndex !== null ? slides[selectedSlideIndex] : null;

  const addSlide = useCallback(
    (type: SlideType) => {
      const newSlide: Slide = {
        id: genId(),
        title: type === "lesson" ? "Новый слайд" : "Новый тест",
        type,
        order: slides.length,
        blocks: [],
      };

      setSlides((prev) => [...prev, newSlide]);
      setSelectedSlideIndex(slides.length);
    },
    [slides.length]
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
      const theoryQuestions = slide.blocks.filter(
        (block) => block.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      let slidePassed = false;
      let slideTestCasesPassed = 0;
      let slideTestCasesTotal = 0;
      let slideConstraintsPassed = true;

      if (codeTasks.length > 0) {
        if (slideTestResult) {
          slideTestCasesPassed = slideTestResult.passedTests || 0;
          slideTestCasesTotal = slideTestResult.totalTests || 0;
          slideConstraintsPassed = slideTestResult.constraintsPassed || false;
          slidePassed = slideTestResult.allPassed || false;
        }
      } else if (theoryQuestions.length > 0) {
        const answer = testAnswer[slide.id];
        const theoryPassed = theoryQuestions.every(
          (question) => typeof answer === "number" && answer === question.correctIndex
        );
        slidePassed = theoryPassed;
        slideTestCasesTotal = theoryQuestions.length;
        slideTestCasesPassed = theoryPassed ? theoryQuestions.length : 0;
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
  }, [slides, testAnswer]);

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
      const theoryQuestions = slide.blocks.filter(
        (block) => block.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      if (codeTasks.length > 0) {
        if (!slideTestResult || !slideTestResult.allPassed) {
          allTasksSolved = false;
          unsolvedTasks.push(slide.title);
        }
      } else if (theoryQuestions.length > 0) {
        const answer = testAnswer[slide.id];
        const theoryPassed = theoryQuestions.every(
          (question) => typeof answer === "number" && answer === question.correctIndex
        );
        if (!theoryPassed) {
          allTasksSolved = false;
          unsolvedTasks.push(slide.title);
        }
      }
    }

    if (!allTasksSolved) {
      alert(`Не все задания выполнены!\n\nНе выполнены: ${unsolvedTasks.join(", ")}`);
      return;
    }

    calculateResults();
  }, [calculateResults, slides, testAnswer]);

  const saveLesson = useCallback(async () => {
    if (!lessonId) {
      setError("ID урока не найден");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const lessonSlidesData = slides
        .filter((slide) => slide.type === "lesson")
        .map((slide) => ({
          title: slide.title,
          type: "lesson" as const,
          orderIndex: slide.order,
          blocks: slide.blocks.map((block) => {
            if (block.type === "image") {
              const { file, ...rest } = block as any;
              return rest;
            }
            return block;
          }),
        }));

      const testSlidesData = slides
        .filter((slide) => slide.type === "test")
        .map((slide) => ({
          title: slide.title,
          orderIndex: slide.order,
          blocks: slide.blocks.map((block) => {
            if (block.type === "image") {
              const { file, ...rest } = block as any;
              return rest;
            }
            return block;
          }),
        }));

      if (lessonDetailsId) {
        await LessonDetailsService.updateLessonDetails(lessonDetailsId, {
          slides: lessonSlidesData,
          tests: testSlidesData,
        });
      } else {
        const response = await LessonDetailsService.createLessonDetails({
          lessonId,
          slides: lessonSlidesData,
          tests: testSlidesData,
        });
        setLessonDetailsId(response.id);
      }

      alert("Урок успешно сохранен!");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Ошибка сохранения урока");
    } finally {
      setIsSaving(false);
    }
  }, [lessonDetailsId, lessonId, slides]);

  if (isLoading) {
    return (
      <section className={styles.lesson}>
        <div className={styles.lesson__container}>
          <h1 className={styles.lesson__title}>Загрузка урока...</h1>
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
            <h1 className={styles.lesson__title}>Превью урока</h1>
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
                  testError={testError[currentSlide.id]}
                  setTestError={(value) =>
                    setTestError((prev) => ({ ...prev, [currentSlide.id]: value }))
                  }
                  onCorrect={goNext}
                  onResults={(results) => {
                    setTestResults((prev) => {
                      const next = { ...prev, [currentSlide.id]: results };
                      testResultsRef.current = next;
                      return next;
                    });
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
        <h1 className={styles.lesson__title}>Редактирование урока</h1>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className={styles.slideActions}>
          <Button
            color="#9F0FA7"
            width="180px"
            textColor="#fff"
            text="Слайд (урок)"
            onClick={() => addSlide("lesson")}
          />
          <Button
            color="#6a0f6e"
            width="180px"
            textColor="#fff"
            text="Слайд (тест)"
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
                  {slide.type === "test" ? "Тест" : "Урок"} {index + 1}: {slide.title || "—"}
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
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Теор. вопрос"
                    onClick={() => addBlock(selectedSlideIndex, "theoryQuestion")}
                  />
                </div>
              )}

              <div className={styles.blocksList}>
                <label className={styles.form__label}>Блоки (порядок можно менять)</label>
                {sortBlocks(selectedSlide.blocks).map((block, index) => (
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
                ))}
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
      </div>
    </section>
  );
}
