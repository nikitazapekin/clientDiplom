import { useEffect, useState } from "react";

import Button from "../Button";

import styles from "./index.module.scss";
import type { Slide, SlideBlock } from "./types";

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
