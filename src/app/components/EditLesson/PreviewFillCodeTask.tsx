import { useMemo, useState } from "react";

import Button from "../Button";

import { StableCodeEditor } from "./editorShared";
import {
  extractFillTaskInputs,
  syncFillTaskTestCases,
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
}

export function PreviewFillCodeTask({
  block,
  answers,
  setAnswers,
  error,
  setError,
  onCorrect,
  onResult,
}: PreviewFillCodeTaskProps) {
  const [successMessage, setSuccessMessage] = useState("");
  const inputIds = useMemo(
    () => extractFillTaskInputs(block.templateCode ?? ""),
    [block.templateCode]
  );
  const testCases = useMemo(
    () => syncFillTaskTestCases(block.testCases, inputIds),
    [block.testCases, inputIds]
  );

  const updateAnswer = (inputId: string, value: string) => {
    setAnswers({
      ...answers,
      [inputId]: value,
    });
    setError("");
    setSuccessMessage("");
  };

  const handleCheck = () => {
    if (inputIds.length === 0) {
      setSuccessMessage("");
      setError("В задаче не найдено ни одного плейсхолдера вида [input].");

      return;
    }

    if (testCases.length === 0) {
      setSuccessMessage("");
      setError("Для этой задачи не настроены варианты проверки.");

      return;
    }

    if (inputIds.some((inputId) => (answers[inputId] ?? "").trim() === "")) {
      setSuccessMessage("");
      setError("Заполните все поля ввода.");

      return;
    }

    const result = validateFillTaskAnswers(testCases, answers, inputIds);

    onResult?.(result);

    if (result.passed) {
      setError("");
      setSuccessMessage(
        `Верно. Подошёл вариант ${result.matchedCaseIndex !== null ? result.matchedCaseIndex + 1 : 1}.`
      );
      onCorrect();

      return;
    }

    setSuccessMessage("");
    setError(`Решение не совпало ни с одним из ${result.totalCases} допустимых вариантов.`);
  };

  return (
    <div className={styles.codeTask}>
      {block.description && <p className={styles.taskDescription}>{block.description}</p>}

      <div className={styles.fillTaskHint}>
        Ниже показан неизменяемый шаблон кода. Введите значения для всех плейсхолдеров.
      </div>

      <StableCodeEditor
        value={block.templateCode}
        onChange={() => {}}
        language={block.language}
        readOnly
        height={220}
      />

      <div className={styles.fillTaskInfo}>
        <span>Доступных вариантов ответа: {testCases.length}</span>
        <span>Нужно совпасть хотя бы с одним из них.</span>
      </div>

      <div className={styles.fillTaskCaseInputs}>
        {inputIds.map((inputId) => (
          <label key={inputId} className={styles.fillTaskCaseInput}>
            <span className={styles.fillTaskCaseLabel}>[{inputId}]</span>
            <input
              className={styles.form__input}
              value={answers[inputId] ?? ""}
              onChange={(e) => updateAnswer(inputId, e.target.value)}
              placeholder={`Введите значение для [${inputId}]`}
            />
          </label>
        ))}
      </div>

      <Button
        color="#9F0FA7"
        width="160px"
        textColor="#fff"
        text="Проверить"
        onClick={handleCheck}
      />

      {successMessage && <p className={styles.fillTaskSuccess}>{successMessage}</p>}
      {error && <pre className={styles.codeOutput}>{error}</pre>}
    </div>
  );
}
