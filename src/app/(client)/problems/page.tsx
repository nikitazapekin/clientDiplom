"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.scss";

import type { CodeLanguage } from "@/app/http/codeService";
import {
  type CodeTask,
  CodingTasksService,
} from "@/app/http/codingTasksService";

const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  easy: { label: "Легкий", color: "#4caf50" },
  medium: { label: "Средний", color: "#ff9800" },
  hard: { label: "Сложный", color: "#f44336" },
};

const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  csharp: "C#",
  java: "Java",
  golang: "Go",
  cpp: "C++",
};

export default function ProblemsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadTasks = useCallback(async () => {
    try {
      const data = await CodingTasksService.getAllTasks();

      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.difficulty === filter);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Coding Challenges</h1>
          <p className={styles.subtitle}>Решайте задачи и набирайте опыт</p>
        </div>

        <div className={styles.filters}>
          {[
            { key: "all", label: "Все", color: "#9F0FA7" },
            { key: "easy", label: "Легкий", color: "#4caf50" },
            { key: "medium", label: "Средний", color: "#ff9800" },
            { key: "hard", label: "Сложный", color: "#f44336" },
          ].map((f) => (
            <button
              key={f.key}
              className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ""}`}
              onClick={() => setFilter(f.key)}
              style={filter === f.key ? { backgroundColor: f.color, color: "#fff", borderColor: f.color } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={styles.emptyText}>Загрузка задач...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.emptyText}>Нет доступных задач</p>
        ) : (
          <div className={styles.taskTable}>
            <div className={styles.tableHeader}>
              <span className={styles.colTitle}>Задача</span>
              <span className={styles.colDiff}>Сложность</span>
              <span className={styles.colLang}>Язык</span>
              <span className={styles.colXp}>Опыт</span>
              <span className={styles.colTests}>Тесты</span>
              <span className={styles.colAction}></span>
            </div>
            {filtered.map((task) => {
              const diff = DIFFICULTIES[task.difficulty] || DIFFICULTIES.easy;

              return (
                <div key={task.id} className={styles.tableRow}>
                  <div className={styles.colTitle}>
                    <span className={styles.taskName}>{task.title}</span>
                    <span className={styles.taskAuthor}>Автор: {task.authorName}</span>
                  </div>
                  <span className={styles.colDiff}>
                    <span className={styles.badge} style={{ backgroundColor: diff.color }}>
                      {diff.label}
                    </span>
                  </span>
                  <span className={styles.colLang}>
                    {(task.languages || []).map((l) => LANG_LABELS[l] || l).join(", ")}
                  </span>
                  <span className={styles.colXp}>
                    <span className={styles.xpBadge}>+{task.experienceReward}</span>
                  </span>
                  <span className={styles.colTests}>{task.testCases?.length || 0}</span>
                  <span className={styles.colAction}>
                    <button
                      className={styles.solveBtn}
                      onClick={() => router.push(`/problems/${task.id}`)}
                    >
                      Решить
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
