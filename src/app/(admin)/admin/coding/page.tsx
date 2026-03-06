"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/app/components/Button";
import CodeEditor from "@/app/components/CodeEditor";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import {
  CodingTasksService,
  type CodeTask,
  type TestCase,
  type CodeConstraint,
} from "@/app/http/codingTasksService";

import styles from "./page.module.scss";

type CodeConstraintType =
  | "maxTimeMs"
  | "maxLines"
  | "forbiddenTokens"
  | "noComments"
  | "noConsoleLog"
  | "maxComplexity"
  | "memoryLimit"
  | "requiredKeywords";

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "golang", label: "Go" },
  { value: "cpp", label: "C++" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Легкий", color: "#4caf50" },
  { value: "medium", label: "Средний", color: "#ff9800" },
  { value: "hard", label: "Сложный", color: "#f44336" },
];

const getDefaultStarterCode = (lang: CodeLanguage): string => {
  switch (lang) {
    case "python":
      return `def solution(n):\n    # Ваш код здесь\n    return n`;
    case "java":
      return `public static int solution(int n) {\n    // Ваш код здесь\n    return n;\n}`;
    case "csharp":
      return `public static int Solution(int n) {\n    // Ваш код здесь\n    return n;\n}`;
    case "golang":
      return `func solution(n int) interface{} {\n    // Ваш код здесь\n    return n\n}`;
    case "cpp":
      return `int solution(int n) {\n    // Ваш код здесь\n    return n;\n}`;
    default:
      return `function solution(n) {\n    // Ваш код здесь\n    return n;\n}`;
  }
};

type View = "list" | "create" | "edit";

export default function CodingPage() {
  const router = useRouter();

  const [view, setView] = useState<View>("list");
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<CodeLanguage[]>(["javascript"]);
  const [startCodes, setStartCodes] = useState<Record<string, string>>({
    javascript: getDefaultStarterCode("javascript"),
  });
  const [activeEditorLang, setActiveEditorLang] = useState<CodeLanguage>("javascript");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [constraints, setConstraints] = useState<CodeConstraint[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [experienceReward, setExperienceReward] = useState(10);

  const [codeOutput, setCodeOutput] = useState("");
  const [runLoading, setRunLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
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

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setDescription("");
    setSelectedLanguages(["javascript"]);
    setStartCodes({ javascript: getDefaultStarterCode("javascript") });
    setActiveEditorLang("javascript");
    setTestCases([]);
    setConstraints([]);
    setDifficulty("easy");
    setExperienceReward(10);
    setCodeOutput("");
  };

  const handleCreate = () => {
    resetForm();
    setView("create");
  };

  const handleEdit = (task: CodeTask) => {
    setEditId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setSelectedLanguages((task.languages || []) as CodeLanguage[]);
    setStartCodes(task.startCodes || {});
    setActiveEditorLang((task.languages?.[0] || "javascript") as CodeLanguage);
    setTestCases(task.testCases || []);
    setConstraints(task.constraints || []);
    setDifficulty(task.difficulty as "easy" | "medium" | "hard");
    setExperienceReward(task.experienceReward);
    setView("edit");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить задачу?")) return;
    try {
      await CodingTasksService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      alert("Заполните название и описание задачи");
      return;
    }
    if (selectedLanguages.length === 0) {
      alert("Выберите хотя бы один язык программирования");
      return;
    }
    if (testCases.length === 0) {
      alert("Добавьте хотя бы один тест-кейс");
      return;
    }
    const missingCode = selectedLanguages.filter((l) => !startCodes[l]?.trim());
    if (missingCode.length > 0) {
      const labels = missingCode.map((l) => LANGUAGES.find((ll) => ll.value === l)?.label || l);
      alert(`Напишите стартовый код для: ${labels.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        languages: selectedLanguages,
        startCodes,
        testCases,
        constraints,
        difficulty,
        experienceReward,
      };

      if (editId) {
        const updated = await CodingTasksService.updateTask(editId, payload);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await CodingTasksService.createTask(payload);
        setTasks((prev) => [created, ...prev]);
      }
      setView("list");
      resetForm();
    } catch (e) {
      console.error("Save failed:", e);
      alert("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: CodeLanguage) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((l) => l !== lang);
        if (activeEditorLang === lang) setActiveEditorLang(next[0]);
        setStartCodes((codes) => {
          const copy = { ...codes };
          delete copy[lang];
          return copy;
        });
        return next;
      }
      setStartCodes((codes) => ({
        ...codes,
        [lang]: codes[lang] || getDefaultStarterCode(lang),
      }));
      return [...prev, lang];
    });
  };

  const updateStartCode = (lang: string, code: string) => {
    setStartCodes((prev) => ({ ...prev, [lang]: code }));
  };

  const addTestCase = () => setTestCases((prev) => [...prev, { input: "", expectedOutput: "" }]);
  const updateTestCase = (i: number, field: keyof TestCase, value: string) =>
    setTestCases((prev) => prev.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)));
  const deleteTestCase = (i: number) => setTestCases((prev) => prev.filter((_, idx) => idx !== i));

  const addConstraint = () =>
    setConstraints((prev) => [...prev, { type: "maxTimeMs", value: 1000 }]);
  const updateConstraint = (i: number, type: string, value: any) =>
    setConstraints((prev) => prev.map((c, idx) => (idx === i ? { type, value } : c)));
  const deleteConstraint = (i: number) =>
    setConstraints((prev) => prev.filter((_, idx) => idx !== i));

  const handleRunCode = async () => {
    setRunLoading(true);
    setCodeOutput("");
    try {
      const res = await CodeService.executeCode({
        language: activeEditorLang,
        code: startCodes[activeEditorLang] || "",
      });
      setCodeOutput(res.error || res.output || "Нет вывода");
    } catch {
      setCodeOutput("Ошибка выполнения");
    } finally {
      setRunLoading(false);
    }
  };

  const filteredTasks =
    filterDifficulty === "all" ? tasks : tasks.filter((t) => t.difficulty === filterDifficulty);

  const difficultyBadge = (d: string) => {
    const info = DIFFICULTIES.find((dd) => dd.value === d);
    return (
      <span className={styles.badge} style={{ backgroundColor: info?.color || "#999" }}>
        {info?.label || d}
      </span>
    );
  };

  const langLabels = (langs: string[]) =>
    (langs || []).map((l) => LANGUAGES.find((ll) => ll.value === l)?.label || l).join(", ");

  if (view === "list") {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Coding Tasks</h1>
            <Button color="#9F0FA7" textColor="#fff" text="+ Создать задачу" onClick={handleCreate} />
          </div>

          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filterDifficulty === "all" ? styles.filterActive : ""}`}
              onClick={() => setFilterDifficulty("all")}
            >
              Все
            </button>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                className={`${styles.filterBtn} ${filterDifficulty === d.value ? styles.filterActive : ""}`}
                onClick={() => setFilterDifficulty(d.value)}
                style={filterDifficulty === d.value ? { backgroundColor: d.color, color: "#fff" } : {}}
              >
                {d.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={styles.emptyText}>Загрузка...</p>
          ) : filteredTasks.length === 0 ? (
            <p className={styles.emptyText}>Нет задач. Создайте первую!</p>
          ) : (
            <div className={styles.taskList}>
              {filteredTasks.map((task) => (
                <div key={task.id} className={styles.taskCard}>
                  <div className={styles.taskCardHeader}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    <div className={styles.taskMeta}>
                      {difficultyBadge(task.difficulty)}
                      <span className={styles.xpBadge}>+{task.experienceReward} XP</span>
                    </div>
                  </div>
                  <p className={styles.taskDesc}>
                    {task.description.length > 150
                      ? task.description.slice(0, 150) + "..."
                      : task.description}
                  </p>
                  <div className={styles.taskFooter}>
                    <span className={styles.taskInfo}>
                      {langLabels(task.languages)} |{" "}
                      {task.testCases?.length || 0} тестов | Автор: {task.authorName}
                    </span>
                    <div className={styles.taskActions}>
                      <button className={styles.editBtn} onClick={() => handleEdit(task)}>
                        Редактировать
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(task.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{editId ? "Редактировать задачу" : "Создать задачу"}</h1>
          <div className={styles.headerActions}>
            <Button color="#666" textColor="#fff" text="Отмена" onClick={() => setView("list")} />
            <Button
              color="#9F0FA7"
              textColor="#fff"
              text={saving ? "Сохранение..." : "Сохранить"}
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formLeft}>
            <div className={styles.formGroup}>
              <label>Название задачи</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Two Sum"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Описание задачи</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Подробное описание задачи, примеры входных и выходных данных..."
                rows={6}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Сложность</label>
                <select
                  className={styles.select}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Опыт (XP)</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={experienceReward}
                  onChange={(e) => setExperienceReward(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Языки программирования</label>
              <div className={styles.langChips}>
                {LANGUAGES.map((l) => {
                  const active = selectedLanguages.includes(l.value);
                  return (
                    <button
                      key={l.value}
                      className={`${styles.langChip} ${active ? styles.langChipActive : ""}`}
                      onClick={() => toggleLanguage(l.value)}
                      type="button"
                    >
                      {active ? "✓ " : ""}
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Стартовый код</label>
              <div className={styles.langTabs}>
                {selectedLanguages.map((lang) => {
                  const info = LANGUAGES.find((l) => l.value === lang);
                  return (
                    <button
                      key={lang}
                      className={`${styles.langTab} ${activeEditorLang === lang ? styles.langTabActive : ""}`}
                      onClick={() => setActiveEditorLang(lang)}
                      type="button"
                    >
                      {info?.label || lang}
                    </button>
                  );
                })}
              </div>
              <div className={styles.codeEditorWrap}>
                <CodeEditor
                  key={activeEditorLang}
                  value={startCodes[activeEditorLang] || ""}
                  onChange={(v) => updateStartCode(activeEditorLang, v)}
                  language={activeEditorLang}
                  height={250}
                  onRun={handleRunCode}
                  runLoading={runLoading}
                />
              </div>
              {codeOutput && (
                <div className={styles.codeOutput}>
                  <strong>Вывод ({LANGUAGES.find((l) => l.value === activeEditorLang)?.label}):</strong>
                  <pre>{codeOutput}</pre>
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRight}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Тест-кейсы (общие для всех языков)</h3>
                <Button
                  color="#9F0FA7"
                  width="auto"
                  textColor="#fff"
                  text="+ Добавить"
                  onClick={addTestCase}
                />
              </div>
              {testCases.length === 0 && (
                <p className={styles.emptyHint}>Добавьте тест-кейсы для проверки решений</p>
              )}
              {testCases.map((tc, i) => (
                <div key={i} className={styles.testCase}>
                  <div className={styles.testCaseHeader}>
                    <span className={styles.testCaseTitle}>Тест #{i + 1}</span>
                    <button className={styles.deleteButton} onClick={() => deleteTestCase(i)}>
                      ✕
                    </button>
                  </div>
                  <input
                    className={styles.input}
                    value={tc.input}
                    onChange={(e) => updateTestCase(i, "input", e.target.value)}
                    placeholder="Входные данные: [2,7,11,15], 9"
                  />
                  <input
                    className={styles.input}
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                    placeholder="Ожидаемый результат: [0,1]"
                  />
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Ограничения</h3>
                <Button
                  color="#FFA500"
                  width="auto"
                  textColor="#fff"
                  text="+ Добавить"
                  onClick={addConstraint}
                />
              </div>
              {constraints.map((c, i) => (
                <div key={i} className={styles.constraint}>
                  <div className={styles.constraintHeader}>
                    <select
                      className={styles.select}
                      value={c.type}
                      onChange={(e) => {
                        const t = e.target.value as CodeConstraintType;
                        let val: any = 1000;
                        if (t === "maxLines") val = 30;
                        if (t === "forbiddenTokens" || t === "requiredKeywords") val = [];
                        if (t === "noComments" || t === "noConsoleLog") val = true;
                        if (t === "maxComplexity") val = 5;
                        if (t === "memoryLimit") val = 256;
                        updateConstraint(i, t, val);
                      }}
                    >
                      <option value="maxTimeMs">Время (мс)</option>
                      <option value="maxLines">Макс. строк</option>
                      <option value="forbiddenTokens">Запрещённые слова</option>
                      <option value="noComments">Без комментариев</option>
                      <option value="noConsoleLog">Без console.log</option>
                      <option value="maxComplexity">Макс. сложность</option>
                      <option value="memoryLimit">Память (МБ)</option>
                      <option value="requiredKeywords">Обязат. слова</option>
                    </select>
                    <button className={styles.deleteButton} onClick={() => deleteConstraint(i)}>
                      ✕
                    </button>
                  </div>
                  {typeof c.value === "number" && (
                    <input
                      className={styles.input}
                      type="number"
                      value={c.value}
                      onChange={(e) => updateConstraint(i, c.type, Number(e.target.value))}
                    />
                  )}
                  {Array.isArray(c.value) && (
                    <input
                      className={styles.input}
                      value={(c.value as string[]).join(", ")}
                      onChange={(e) =>
                        updateConstraint(
                          i,
                          c.type,
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Через запятую: eval, exec"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
