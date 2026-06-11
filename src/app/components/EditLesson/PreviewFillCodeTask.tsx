import { useEffect, useMemo, useRef, useState } from "react";

import Button from "../Button";

import { FillTaskCodeSlots } from "./FillTaskCodeSlots";
import {
  extractFillTaskInputs,
  normalizeFillTaskBlock,
  validateFillTaskAnswers,
} from "./fillTaskUtils";
import styles from "./index.module.scss";
import type { FillCodeTaskBlock } from "./types";

interface PreviewFillCodeTaskProps {
  block: FillCodeTaskBlock;
  answers: Record<string, string>;
  setAnswers: (answers: Record<string, string>) => void;
  error?: string;
  setError: (value: string) => void;
  onCorrect: () => void;
  onResult?: (result: {
    passed: boolean;
    matchedCaseIndex: number | null;
    totalCases: number;
  }) => void;
  onAdvanceNext?: () => void;
}

export function PreviewFillCodeTask({
  block,
  answers,
  setAnswers,
  error,
  setError,
  onCorrect,
  onResult,
  onAdvanceNext,
}: PreviewFillCodeTaskProps) {
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const advanceTimerRef = useRef<number | null>(null);
  const normalizedBlock = useMemo(() => normalizeFillTaskBlock(block), [block]);
  const slotIds = useMemo(
    () => extractFillTaskInputs(normalizedBlock.templateCode ?? ""),
    [normalizedBlock.templateCode]
  );

  useEffect(
    () => () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    },
    []
  );

  const scheduleAdvance = () => {
    if (!onAdvanceNext) {
      return;
    }

    advanceTimerRef.current = window.setTimeout(() => {
      onAdvanceNext();
    }, 2000);
  };

  const updateAnswer = (slotId: string, optionId: string | null) => {
    if (isLocked) {
      return;
    }

    setAnswers({
      ...answers,
      [slotId]: optionId ?? "",
    });
    setError("");
    setSuccessMessage("");
  };

  const handleCheck = () => {
    if (isLocked) {
      return;
    }

    if (slotIds.length === 0) {
      setSuccessMessage("");
      setError("В задаче не найдено ни одного слота вида [[slot-name]].");

      return;
    }

    if (normalizedBlock.testCases.length === 0) {
      setSuccessMessage("");
      setError("Для этой задачи не настроены варианты проверки.");

      return;
    }

    if (slotIds.some((slotId) => (answers[slotId] ?? "").trim() === "")) {
      setSuccessMessage("");
      setError("Заполните все белые поля, перетащив в них варианты.");

      return;
    }

    const result = validateFillTaskAnswers(
      normalizedBlock.testCases,
      answers,
      slotIds,
      normalizedBlock.options
    );

    onResult?.(result);
    setIsLocked(true);

    if (result.passed) {
      setError("");
      setSuccessMessage("Верно");
      onCorrect();
      scheduleAdvance();

      return;
    }

    setSuccessMessage("");
    setError("Неверно");
    scheduleAdvance();
  };

  return (
    <div className={styles.codeTask}>
      {block.description && <p className={styles.taskDescription}>{block.description}</p>}

      <div className={styles.fillTaskHint}>
        Код менять нельзя. Перетаскивайте варианты в белые поля внутри шаблона или кликните по
        варианту, а затем по нужному полю.
      </div>

      <FillTaskCodeSlots
        templateCode={normalizedBlock.templateCode}
        answers={answers}
        options={normalizedBlock.options}
        onAssign={updateAnswer}
        selectedOptionId={selectedOptionId}
        readOnly={isLocked}
      />

      <div className={styles.fillTaskInfo}>
        <span>Вариантов для перетаскивания: {normalizedBlock.options.length}</span>
        <span>
          Проверка пройдёт, если заполнение совпадёт хотя бы с одной допустимой комбинацией.
        </span>
      </div>

      <div className={styles.fillTaskOptionBank}>
        {normalizedBlock.options.map((option) => (
          <button
            key={option.id}
            type="button"
            draggable
            className={`${styles.fillTaskOptionChip} ${
              selectedOptionId === option.id ? styles.fillTaskOptionChipActive : ""
            }`}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", option.id);
              setSelectedOptionId(option.id);
            }}
            onDragEnd={() => setSelectedOptionId(null)}
            onClick={() => {
              if (isLocked) {
                return;
              }

              setSelectedOptionId((current) => (current === option.id ? null : option.id));
            }}
            disabled={isLocked}
          >
            {option.value || "(пустое значение)"}
          </button>
        ))}
      </div>

      <Button
        color="#9F0FA7"
        width="160px"
        textColor="#fff"
        text="Проверить"
        onClick={handleCheck}
        disabled={isLocked}
      />

      {successMessage && <p className={styles.fillTaskSuccess}>{successMessage}</p>}
      {error && <p className={styles.feedbackError}>{error}</p>}
    </div>
  );
}
