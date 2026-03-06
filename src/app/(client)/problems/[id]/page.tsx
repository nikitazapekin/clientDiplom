"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/app/components/Button";
import CodeEditor from "@/app/components/CodeEditor";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import {
  CodingTasksService,
  type CodeTask,
  type SubmitSolutionResult,
  type StudentLevel,
} from "@/app/http/codingTasksService";

import styles from "./page.module.scss";

const DIFF_COLORS: Record<string, string> = {
  easy: "#4caf50",
  medium: "#ff9800",
  hard: "#f44336",
};

const DIFF_LABELS: Record<string, string> = {
  easy: "Легкий",
  medium: "Средний",
  hard: "Сложный",
};

export default function SolveProblemPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<CodeTask | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [result, setResult] = useState<SubmitSolutionResult | null>(null);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);

  const loadTask = useCallback(async () => {
    try {
      const [data, level] = await Promise.all([
        CodingTasksService.getTask(taskId),
        CodingTasksService.getStudentLevel().catch(() => null),
      ]);
      setTask(data);
      setCode(data.startCode || "");
      setStudentLevel(level);
    } catch (e) {
      console.error("Failed to load task:", e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleRun = async () => {
    if (!task) return;
    setRunLoading(true);
    setConsoleOutput("");
    try {
      const res = await CodeService.executeCode({
        language: task.language as CodeLanguage,
        code,
      });
      setConsoleOutput(res.error || res.output || "Нет вывода");
    } catch {
      setConsoleOutput("Ошибка выполнения");
    } finally {
      setRunLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!task) return;
    setSubmitLoading(true);
    setResult(null);
    try {
      const res = await CodingTasksService.submitSolution(task.id, code, task.language);
      setResult(res);
    } catch (e: any) {
      alert(e?.message || "Ошибка отправки решения");
    } finally {
      setSubmitLoading(false);
    }
  };

  const getRequiredExp = (level: number) => Math.pow(10, level - 1);

  if (loading || !task) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingText}>Загрузка задачи...</div>
      </div>
    );
  }

  const diffColor = DIFF_COLORS[task.difficulty] || DIFF_COLORS.easy;
  const diffLabel = DIFF_LABELS[task.difficulty] || task.difficulty;
  const passedCount = result?.results?.filter((r) => r.passed).length ?? 0;
  const totalCount = result?.results?.length ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <button className={styles.backBtn} onClick={() => router.push("/problems")}>
            ← Назад к задачам
          </button>

          <div className={styles.taskInfo}>
            <h1 className={styles.taskTitle}>{task.title}</h1>
            <div className={styles.metaRow}>
              <span className={styles.badge} style={{ backgroundColor: diffColor }}>
                {diffLabel}
              </span>
              <span className={styles.xpBadge}>+{task.experienceReward} XP</span>
              <span className={styles.langTag}>{task.language}</span>
              <span className={styles.authorTag}>Автор: {task.authorName}</span>
            </div>
          </div>

          <div className={styles.description}>
            <h3>Описание</h3>
            <p>{task.description}</p>
          </div>

          {task.constraints && task.constraints.length > 0 && (
            <div className={styles.constraintsBox}>
              <h3>Ограничения</h3>
              {task.constraints.map((c, i) => (
                <div key={i} className={styles.constraintItem}>
                  {c.type === "maxTimeMs" && `⏱ Время: ${c.value}мс`}
                  {c.type === "maxLines" && `📏 Макс. строк: ${c.value}`}
                  {c.type === "forbiddenTokens" &&
                    `🚫 Запрещено: ${(c.value as string[]).join(", ")}`}
                  {c.type === "noComments" && "💬 Без комментариев"}
                  {c.type === "noConsoleLog" && "📢 Без console.log"}
                  {c.type === "maxComplexity" && `🔄 Макс. сложность: ${c.value}`}
                  {c.type === "memoryLimit" && `💾 Память: ${c.value} МБ`}
                  {c.type === "requiredKeywords" &&
                    `🔑 Обязательно: ${(c.value as string[]).join(", ")}`}
                </div>
              ))}
            </div>
          )}

          {task.testCases && task.testCases.length > 0 && (
            <div className={styles.examplesBox}>
              <h3>Примеры</h3>
              {task.testCases.slice(0, 2).map((tc, i) => (
                <div key={i} className={styles.example}>
                  <div>
                    <strong>Вход:</strong> <code>{tc.input}</code>
                  </div>
                  <div>
                    <strong>Выход:</strong> <code>{tc.expectedOutput}</code>
                  </div>
                </div>
              ))}
              {task.testCases.length > 2 && (
                <p className={styles.moreTests}>
                  + ещё {task.testCases.length - 2} скрытых тестов
                </p>
              )}
            </div>
          )}

          {studentLevel && (
            <div className={styles.levelBox}>
              <div className={styles.levelRow}>
                <span>Уровень {studentLevel.level}</span>
                <span>
                  {studentLevel.experience} / {getRequiredExp(studentLevel.level)} XP
                </span>
              </div>
              <div className={styles.xpBar}>
                <div
                  className={styles.xpFill}
                  style={{
                    width: `${Math.min(
                      (studentLevel.experience / getRequiredExp(studentLevel.level)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.editorHeader}>
            <span className={styles.editorTitle}>Решение</span>
            <div className={styles.editorActions}>
              <Button
                color="#374151"
                textColor="#fff"
                text={runLoading ? "..." : "▶ Запустить"}
                onClick={handleRun}
                disabled={runLoading}
                width="auto"
              />
              <Button
                color="#9F0FA7"
                textColor="#fff"
                text={submitLoading ? "Проверка..." : "Проверить"}
                onClick={handleSubmit}
                disabled={submitLoading}
                width="auto"
              />
            </div>
          </div>

          <div className={styles.editorWrap}>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={task.language as CodeLanguage}
              height={400}
              onRun={handleRun}
              runLoading={runLoading}
            />
          </div>

          {consoleOutput && (
            <div className={styles.consoleBox}>
              <strong>Консоль</strong>
              <pre>{consoleOutput}</pre>
            </div>
          )}

          {result && (
            <div className={styles.resultsBox}>
              <div className={styles.resultsHeader}>
                <h3>{result.allPassed ? "Все тесты пройдены!" : "Есть ошибки"}</h3>
                <span
                  className={styles.resultsScore}
                  style={{ color: result.allPassed ? "#4caf50" : "#f44336" }}
                >
                  {passedCount}/{totalCount}
                </span>
              </div>

              {result.experienceGained > 0 && (
                <div className={styles.xpGained}>
                  +{result.experienceGained} XP | Уровень: {result.newLevel}
                </div>
              )}

              <div className={styles.testResults}>
                {result.results.map((r) => (
                  <div
                    key={r.index}
                    className={`${styles.testResult} ${
                      r.passed ? styles.testPassed : styles.testFailed
                    }`}
                  >
                    <div className={styles.testResultHeader}>
                      <span>Тест #{r.index + 1}</span>
                      <span>{r.passed ? "Пройден" : "Провален"}</span>
                    </div>
                    <div className={styles.testResultDetails}>
                      <span>Вход: {r.input}</span>
                      <span>Ожидалось: {r.expected}</span>
                      <span>Получено: {r.actual}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
