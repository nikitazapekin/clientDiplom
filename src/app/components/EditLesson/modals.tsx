import { useEffect, useState } from "react";

import Button from "../Button";

import { BlockEditor } from "./BlockEditor";
import styles from "./index.module.scss";
import type { Slide, SlideBlock } from "./types";

import type { CodeLanguage } from "@/app/http/codeService";
import { type BlockReview, ReviewStatus } from "@/app/http/reviewService";

const REVIEW_FIELD_LABELS: Record<string, string> = {
  content: "Текст",
  code: "Код",
  language: "Язык",
  runnable: "Режим запуска",
  url: "Ссылка",
  note: "Примечание",
  rows: "Строки",
  cols: "Столбцы",
  cells: "Ячейки",
  description: "Описание",
  startCode: "Стартовый код",
  testCases: "Тест-кейсы",
  constraints: "Ограничения",
  expectedOutput: "Ожидаемый вывод",
  argumentScheme: "Аргументы",
  returnType: "Тип возврата",
  returnSchema: "Схема возврата",
  templateCode: "Шаблон кода",
  options: "Опции",
  text: "Вопрос",
  imageUrl: "Изображение",
  correctIndex: "Правильный ответ",
};

const formatReviewValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value == null) {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function SourceModal({
  isOpen,
  onClose,
  sources,
}: {
  isOpen: boolean;
  onClose: () => void;
  sources: { url: string; note?: string }[];
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Источники</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {sources.length === 0 ? (
            <p>Нет источников</p>
          ) : (
            <ul className={styles.sourcesList}>
              {sources.map((source, index) => (
                <li key={index} className={styles.sourceItem}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    {source.url}
                  </a>
                  {source.note && <p className={styles.sourceNote}>{source.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResultsModal({
  isOpen,
  onClose,
  results,
  totalTasks,
  completedTasks,
  totalTestCases,
  passedTestCases,
  constraintsPassed,
  slides,
}: {
  isOpen: boolean;
  onClose: () => void;
  results: {
    slideId: string;
    title: string;
    passed: boolean;
    testCasesPassed: number;
    testCasesTotal: number;
    constraintsPassed: boolean;
  }[];
  totalTasks: number;
  completedTasks: number;
  totalTestCases: number;
  passedTestCases: number;
  constraintsPassed: boolean;
  slides: Slide[];
}) {
  const [stars, setStars] = useState(0);
  const [animatingStars, setAnimatingStars] = useState<number[]>([]);
  const [showStars, setShowStars] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStars(0);
      setAnimatingStars([]);
      setShowStars(false);

      const theoryTasks = results.filter((r: { slideId: string }) => {
        const slide = slides.find((s: Slide) => s.id === r.slideId);

        return slide?.blocks.some((b: SlideBlock) => b.type === "theoryQuestion");
      });

      const theoryPassed = theoryTasks.every((t: { passed: boolean }) => t.passed);
      const allTestsPassed = passedTestCases === totalTestCases && totalTestCases > 0;
      const allTasksCompleted = completedTasks === totalTasks;

      let starCount = 0;

      if (allTestsPassed && !constraintsPassed) {
        starCount = 1;
      }

      if (allTestsPassed && theoryPassed && !constraintsPassed) {
        starCount = 2;
      }

      if (allTestsPassed && theoryPassed && constraintsPassed && allTasksCompleted) {
        starCount = 3;
      }

      setStars(0);
      setAnimatingStars([]);
      setShowStars(false);

      setTimeout(() => {
        setStars(starCount);

        const animateStars = async () => {
          setShowStars(true);

          for (let i = 0; i < starCount; i++) {
            setAnimatingStars((prev) => [...prev, i]);
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        };

        animateStars();
      }, 300);
    }
  }, [
    isOpen,
    results,
    completedTasks,
    totalTasks,
    totalTestCases,
    passedTestCases,
    constraintsPassed,
    slides,
  ]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.resultsModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Результаты урока</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.starsContainer}>
            {showStars &&
              [0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`${styles.starWrapper} ${
                    animatingStars.includes(index) ? styles.starFalling : ""
                  } ${index < stars ? styles.starVisible : styles.starHidden}`}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    left: `${30 + index * 20}%`,
                  }}
                >
                  <span className={`${styles.star} ${index < stars ? styles.starFilled : ""}`}>
                    ★
                  </span>
                </div>
              ))}
          </div>

          <div className={styles.resultsSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Выполнено заданий:</span>
              <span className={styles.summaryValue}>
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Пройдено тестов:</span>
              <span className={styles.summaryValue}>
                {passedTestCases}/{totalTestCases}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Ограничения:</span>
              <span className={styles.summaryValue}>{constraintsPassed ? "✅" : "❌"}</span>
            </div>
          </div>

          <div className={styles.resultsList}>
            <h4>Детали по заданиям:</h4>
            {results.map((result) => (
              <div
                key={result.slideId}
                className={`${styles.resultItem} ${result.passed ? styles.resultPassed : styles.resultFailed}`}
              >
                <div className={styles.resultTitle}>{result.title}</div>
                <div className={styles.resultDetails}>
                  <span>
                    Тесты: {result.testCasesPassed}/{result.testCasesTotal}
                  </span>
                  <span>Ограничения: {result.constraintsPassed ? "✅" : "❌"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <Button color="#9F0FA7" width="200px" textColor="#fff" text="Закрыть" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

export function BlockReviewModal({
  isOpen,
  block,
  slideTitle,
  comment,
  onCommentChange,
  onBlockChange,
  onImageUpload,
  onClose,
  onSubmit,
  isSubmitting,
  runCode,
  codeRunOutput,
  codeRunLoading,
}: {
  isOpen: boolean;
  block: SlideBlock | null;
  slideTitle: string;
  comment: string;
  onCommentChange: (value: string) => void;
  onBlockChange: (patch: Partial<SlideBlock>) => void;
  onImageUpload: (file: File) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  runCode: (blockId: string, lang: CodeLanguage, code: string) => void;
  codeRunOutput?: string;
  codeRunLoading?: boolean;
}) {
  if (!isOpen || !block) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.reviewModal}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Предложить правку</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={`${styles.modalBody} ${styles.reviewModalBody}`}>
          <div className={styles.reviewModalFields}>
            <div className={styles.reviewModalField}>
              <span className={styles.reviewModalLabel}>Слайд</span>
              <div className={styles.reviewModalChanges}>{slideTitle}</div>
            </div>

            <div className={styles.reviewModalField}>
              <span className={styles.reviewModalLabel}>Изменения блока</span>
              <BlockEditor
                block={block}
                slideIndex={0}
                updateBlock={(_, __, patch) => onBlockChange(patch)}
                onImageUpload={(_, __, file) => onImageUpload(file)}
                runCode={runCode}
                codeRunOutput={codeRunOutput}
                codeRunLoading={codeRunLoading}
              />
            </div>

            <div className={styles.reviewModalField}>
              <label className={styles.reviewModalLabel} htmlFor="review-comment">
                Комментарий
              </label>
              <textarea
                id="review-comment"
                className={styles.reviewModalTextarea}
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder="Что именно предлагается изменить"
              />
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <Button
            color="#d9dbe5"
            width="160px"
            textColor="#1f2937"
            text="Отменить"
            onClick={onClose}
            disabled={isSubmitting}
          />
          <Button
            color="#2196f3"
            width="180px"
            textColor="#fff"
            text={isSubmitting ? "Отправка..." : "Предложить"}
            onClick={onSubmit}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}

export function BlockReviewsModal({
  isOpen,
  slideTitle,
  reviews,
  actionLoading,
  onAccept,
  onReject,
  onClose,
}: {
  isOpen: boolean;
  slideTitle: string;
  reviews: BlockReview[];
  actionLoading: Record<string, boolean>;
  onAccept: (review: BlockReview) => void;
  onReject: (review: BlockReview) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.reviewModal}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Правки блока</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={`${styles.modalBody} ${styles.reviewModalBody}`}>
          <div className={styles.reviewModalFields}>
            <div className={styles.reviewModalField}>
              <span className={styles.reviewModalLabel}>Слайд</span>
              <div className={styles.reviewModalChanges}>{slideTitle}</div>
            </div>

            {reviews.length === 0 ? (
              <div className={styles.reviewListEmpty}>Для этого блока пока нет правок.</div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className={`${styles.reviewItem} ${
                    review.status === ReviewStatus.PENDING
                      ? styles.reviewItemPending
                      : review.status === ReviewStatus.ACCEPTED
                        ? styles.reviewItemAccepted
                        : styles.reviewItemRejected
                  }`}
                >
                  <div className={styles.reviewItemHeader}>
                    <span className={styles.reviewItemReviewer}>{review.reviewerName}</span>
                    <span
                      className={`${styles.reviewStatus} ${
                        review.status === ReviewStatus.PENDING
                          ? styles.pending
                          : review.status === ReviewStatus.ACCEPTED
                            ? styles.accepted
                            : styles.rejected
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>

                  <div className={styles.reviewItemComment}>
                    {review.comment || "Без комментария"}
                  </div>

                  <div className={styles.reviewItemChanges}>
                    {Object.entries(review.proposedChanges).map(([field, value]) => {
                      const formattedValue = formatReviewValue(value);
                      const isCodeValue =
                        field.toLowerCase().includes("code") || formattedValue.includes("\n");

                      return (
                        <div key={field} className={styles.reviewChangeItem}>
                          <span className={styles.reviewChangeLabel}>
                            {REVIEW_FIELD_LABELS[field] ?? field}
                          </span>
                          <span
                            className={`${styles.reviewChangeValue} ${
                              isCodeValue ? styles.reviewChangeCode : ""
                            }`}
                          >
                            {formattedValue}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.reviewListMeta}>
                    {new Date(review.createdAt).toLocaleString("ru-RU")}
                  </div>

                  {review.status === ReviewStatus.PENDING && (
                    <div className={styles.reviewItemActions}>
                      <button
                        type="button"
                        className={`${styles.reviewItemActionBtn} ${styles.accept}`}
                        onClick={() => onAccept(review)}
                        disabled={actionLoading[review.id]}
                      >
                        {actionLoading[review.id] ? "..." : "Применить"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.reviewItemActionBtn} ${styles.reject}`}
                        onClick={() => onReject(review)}
                        disabled={actionLoading[review.id]}
                      >
                        {actionLoading[review.id] ? "..." : "Отклонить"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <Button color="#2196f3" width="180px" textColor="#fff" text="Закрыть" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}
