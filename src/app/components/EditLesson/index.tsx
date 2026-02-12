"use client";

import { useCallback, useState } from "react";

import Button from "../Button";
import CodeEditor from "../CodeEditor";

import styles from "./index.module.scss";
import type {
  CodeConstraintType,
  CodeExampleBlock,
  CodeTaskBlock,
  ImageBlock,
  Slide,
  SlideBlock,
  SlideType,
  SourceBlock,
  TableBlock,
  TextBlock,
  TheoryQuestionBlock,
} from "./types";

import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
/* eslint-disable */
const genId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "golang", label: "Go" },
];

const createTextBlock = (order: number): TextBlock => ({
  id: genId(),
  order,
  type: "text",
  content: "",
});

const createCodeExampleBlock = (order: number): CodeExampleBlock => ({
  id: genId(),
  order,
  type: "codeExample",
  code: "",
  language: "javascript",
  runnable: false,
});

const createSourceBlock = (order: number): SourceBlock => ({
  id: genId(),
  order,
  type: "source",
  url: "",
});

const createTableBlock = (order: number, rows = 2, cols = 2): TableBlock => ({
  id: genId(),
  order,
  type: "table",
  rows,
  cols,
  cells: Array(rows)
    .fill(null)
    .map(() => Array(cols).fill("")),
});

const createImageBlock = (order: number): ImageBlock => ({
  id: genId(),
  order,
  type: "image",
  url: "",
});

const getDefaultStarterCode = (language: CodeLanguage): string => {
  switch (language) {
    case "csharp":
      return `using System;

public class Program
{
    public static int YourFunction(int n)
    {
        // Ваш код здесь
        return 0;
    }
}`;
    case "java":
      return `public class Kata {
    public static int yourFunction(int n) {
        // Ваш код здесь
        return 0;
    }
    
    public static void main(String[] args) {
        // Этот метод нужен для запуска, но не используется в тестах
    }
}`;

    case "python":
      return "def your_function(n):\n    # Ваш код здесь\n    return 0";
    case "golang":
      return "package main\n\nfunc yourFunction(n int) int {\n    // Ваш код здесь\n    return 0\n}";
    default:
      return "function yourFunction(n) {\n    // Ваш код здесь\n    return 0;\n}";
  }
};

const createCodeTaskBlock = (order: number): CodeTaskBlock => ({
  id: genId(),
  order,
  type: "codeTask",
  runnable: true,
  language: "javascript",
  startCode: getDefaultStarterCode("javascript"),
  testCases: [],
  constraints: [],
});

const createTheoryQuestionBlock = (order: number): TheoryQuestionBlock => ({
  id: genId(),
  order,
  type: "theoryQuestion",
  options: ["", ""],
  correctIndex: 0,
});

function sortBlocks(blocks: SlideBlock[]): SlideBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

export default function EditLesson() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState<{ [slideId: string]: string | number }>({});
  const [testError, setTestError] = useState<{ [slideId: string]: string }>({});
  const [codeRunOutput, setCodeRunOutput] = useState<{ [blockId: string]: string }>({});
  const [codeRunLoading, setCodeRunLoading] = useState<{ [blockId: string]: boolean }>({});

  const selectedSlide = selectedSlideIndex !== null ? slides[selectedSlideIndex] : null;
  const lessonSlides = slides.filter((s) => s.type === "lesson");
  const testSlides = slides.filter((s) => s.type === "test");

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

  const addBlock = useCallback(
    (slideIndex: number, kind: SlideBlock["type"]) => {
      const slide = slides[slideIndex];
      if (!slide) return;

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
          return;
      }

      setSlides((prev) => {
        const next = [...prev];
        next[slideIndex] = { ...next[slideIndex], blocks: [...next[slideIndex].blocks, block] };
        return next;
      });
    },
    [slides]
  );

  const updateBlock = useCallback(
    (slideIndex: number, blockId: string, patch: Partial<SlideBlock>) => {
      setSlides((prev) => {
        const next = [...prev];
        const slide = next[slideIndex];
        if (!slide) return prev;

        next[slideIndex] = {
          ...slide,
          blocks: slide.blocks.map((b) =>
            b.id === blockId ? { ...b, ...patch } : b
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

      const blocks = slide.blocks.filter((b) => b.id !== blockId);
      blocks.forEach((b, i) => ((b as SlideBlock).order = i));
      next[slideIndex] = { ...slide, blocks };
      return next;
    });
  }, []);

  const moveBlock = useCallback((slideIndex: number, blockId: string, direction: "up" | "down") => {
    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      const sorted = sortBlocks(slide.blocks);
      const i = sorted.findIndex((b) => b.id === blockId);
      if (i < 0) return prev;

      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= sorted.length) return prev;

      [sorted[i].order, sorted[j].order] = [sorted[j].order, sorted[i].order];
      next[slideIndex] = { ...slide, blocks: sortBlocks(sorted) };
      return next;
    });
  }, []);

  const runCode = useCallback(async (blockId: string, language: CodeLanguage, code: string) => {
    setCodeRunLoading((prev) => ({ ...prev, [blockId]: true }));
    setCodeRunOutput((prev) => ({ ...prev, [blockId]: "" }));
    try {
      const res = await CodeService.executeCode({ language, code });
      const text = res.error ? `Ошибка: ${res.error}` : res.output || "";
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: text }));
    } finally {
      setCodeRunLoading((prev) => ({ ...prev, [blockId]: false }));
    }
  }, []);

  const saveLesson = useCallback(() => {
    const data = JSON.stringify({ slides });
    console.log("Lesson content (for API):", data);
  }, [slides]);

  if (previewMode) {
    const allOrdered = [...lessonSlides, ...testSlides].sort((a, b) => a.order - b.order);
    const current = allOrdered[previewSlideIndex];

    if (!current) {
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

    const isTest = current.type === "test";
    const goNext = () => {
      if (previewSlideIndex >= allOrdered.length - 1) setPreviewMode(false);
      else setPreviewSlideIndex((i) => i + 1);
    };

    return (
      <section className={styles.lesson}>
        <div className={styles.lesson__container}>
          <div className={styles.previewTop}>
            <h1 className={styles.lesson__title}>Превью: {current.title}</h1>
            <Button
              color="#9F0FA7"
              width="200px"
              textColor="#fff"
              text="Выйти из превью"
              onClick={() => setPreviewMode(false)}
            />
          </div>
          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              <h3 className={styles.preview__subtitle}>{current.title}</h3>
              {sortBlocks(current.blocks).map((block) => (
                <PreviewBlock
                  key={block.id}
                  block={block}
                  slideId={current.id}
                  runCode={runCode}
                  codeRunOutput={codeRunOutput[block.id]}
                  codeRunLoading={codeRunLoading[block.id]}
                  testAnswer={testAnswer[current.id]}
                  setTestAnswer={(v) => setTestAnswer((prev) => ({ ...prev, [current.id]: v }))}
                  testError={testError[current.id]}
                  setTestError={(v) => setTestError((prev) => ({ ...prev, [current.id]: v }))}
                  onCorrect={goNext}
                />
              ))}
              {!isTest && (
                <Button
                  color="#9F0FA7"
                  width="200px"
                  textColor="#fff"
                  text="Далее"
                  onClick={goNext}
                />
              )}
            </div>
          </div>
          <div className={styles.previewNav}>
            <span>
              {previewSlideIndex + 1} / {allOrdered.length}
            </span>
            <Button
              color="#9F0FA7"
              width="120px"
              textColor="#fff"
              text="Назад"
              onClick={() => setPreviewSlideIndex((i) => Math.max(0, i - 1))}
            />
            <Button color="#9F0FA7" width="120px" textColor="#fff" text="Вперёд" onClick={goNext} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.lesson}>
      <div className={styles.lesson__container}>
        <h1 className={styles.lesson__title}>Редактирование урока</h1>

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
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={selectedSlideIndex === i ? styles.slideTabActive : styles.slideTab}
                onClick={() => setSelectedSlideIndex(i)}
              >
                {s.type === "test" ? "Тест" : "Урок"} {i + 1}: {s.title || "—"}
              </button>
            ))}
          </div>
        )}

        {selectedSlide !== null && selectedSlideIndex !== null && (
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
                {sortBlocks(selectedSlide.blocks).map((block, idx) => (
                  <div key={block.id} className={styles.blockCard}>
                    <div className={styles.blockCard__toolbar}>
                      <span className={styles.blockCard__type}>{block.type}</span>
                      <button
                        type="button"
                        onClick={() => moveBlock(selectedSlideIndex, block.id, "up")}
                        disabled={idx === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(selectedSlideIndex, block.id, "down")}
                        disabled={idx === selectedSlide.blocks.length - 1}
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
                      block={block}
                      slideIndex={selectedSlideIndex}
                      updateBlock={updateBlock}
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
          <h2 className={styles.preview__title}>Превью урока</h2>
          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              {slides.length === 0 ? (
                <p>Добавьте слайды</p>
              ) : (
                sortBlocks(selectedSlide?.blocks ?? []).map((b) => (
                  <PreviewBlockStatic key={b.id} block={b} />
                ))
              )}
            </div>
          </div>
        </div>

        <Button
          color="#9F0FA7"
          width="413px"
          textColor="#fff"
          text="Открыть превью"
          onClick={() => setPreviewMode(true)}
        />
        <Button
          color="#9F0FA7"
          width="413px"
          textColor="#fff"
          text="Сохранить изменения"
          onClick={saveLesson}
        />
      </div>
    </section>
  );
}

function BlockEditor({
  block,
  slideIndex,
  updateBlock,
  runCode,
  codeRunOutput,
  codeRunLoading,
}: {
  block: SlideBlock;
  slideIndex: number;
  updateBlock: (slideIndex: number, blockId: string, patch: Partial<SlideBlock>) => void;
  runCode: (blockId: string, lang: CodeLanguage, code: string) => void;
  codeRunOutput: string | undefined;
  codeRunLoading: boolean | undefined;
}) {
  if (block.type === "text") {
    return (
      <textarea
        className={styles.form__textarea}
        value={block.content}
        onChange={(e) => updateBlock(slideIndex, block.id, { content: e.target.value })}
        placeholder="Текст"
      />
    );
  }

  if (block.type === "codeExample") {
    return (
      <div className={styles.blockEditor}>
        <select
          value={block.language}
          onChange={(e) =>
            updateBlock(slideIndex, block.id, { language: e.target.value as CodeLanguage })
          }
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={block.runnable ? "run" : "demo"}
          onChange={(e) =>
            updateBlock(slideIndex, block.id, { runnable: e.target.value === "run" })
          }
        >
          <option value="demo">Демо (не запускаемый)</option>
          <option value="run">Запускаемый</option>
        </select>
        <CodeEditor
          value={block.code}
          onChange={(v) => updateBlock(slideIndex, block.id, { code: v })}
          language={block.language}
          height={220}
          className={styles.codeEditorWrap}
          onRun={block.runnable ? () => runCode(block.id, block.language, block.code) : undefined}
          runLoading={block.runnable && !!codeRunLoading}
        />
        {block.runnable && codeRunOutput != null && (
          <pre className={styles.codeOutput}>{codeRunOutput}</pre>
        )}
      </div>
    );
  }

  if (block.type === "source") {
    return (
      <div className={styles.blockEditor}>
        <input
          className={styles.form__input}
          value={block.url}
          onChange={(e) => updateBlock(slideIndex, block.id, { url: e.target.value })}
          placeholder="Ссылка на источник"
        />
        <input
          className={styles.form__input}
          value={block.note ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { note: e.target.value || undefined })}
          placeholder="Примечание (описание источника)"
        />
      </div>
    );
  }

  if (block.type === "table") {
    const setCell = (r: number, c: number, v: string) => {
      const cells = block.cells.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? v : cell))
      );
      updateBlock(slideIndex, block.id, { cells });
    };
    const setSize = (rows: number, cols: number) => {
      const cells: string[][] = [];
      for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) cells[r][c] = block.cells[r]?.[c] ?? "";
      }
      updateBlock(slideIndex, block.id, { rows, cols, cells });
    };

    return (
      <div className={styles.blockEditor}>
        <div className={styles.form__wrapper}>
          <span>Строк:</span>
          <select value={block.rows} onChange={(e) => setSize(Number(e.target.value), block.cols)}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>Столбцов:</span>
          <select value={block.cols} onChange={(e) => setSize(block.rows, Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <table className={styles.table}>
          <tbody>
            {block.cells.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className={styles.tableInput}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <input
        className={styles.form__input}
        value={block.url}
        onChange={(e) => updateBlock(slideIndex, block.id, { url: e.target.value })}
        placeholder="URL изображения"
      />
    );
  }

  if (block.type === "codeTask") {
    const addTestCase = () => {
      const testCases = [...(block.testCases ?? []), { input: "", expectedOutput: "" }];
      updateBlock(slideIndex, block.id, { testCases });
    };
    const updateTestCase = (i: number, field: "input" | "expectedOutput", value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[i]) testCases[i] = { input: "", expectedOutput: "" };
      testCases[i][field] = value;
      updateBlock(slideIndex, block.id, { testCases });
    };
    const addConstraint = () => {
      const constraints = [
        ...(block.constraints ?? []),
        { type: "maxTimeMs" as CodeConstraintType, value: 1000 },
      ];
      updateBlock(slideIndex, block.id, { constraints });
    };
    const updateConstraint = (i: number, type: CodeConstraintType, value: number | string[]) => {
      const constraints = [...(block.constraints ?? [])];
      if (!constraints[i]) constraints[i] = { type: "maxTimeMs", value: 1000 };
      constraints[i] = { type, value };
      updateBlock(slideIndex, block.id, { constraints });
    };

    return (
      <div className={styles.blockEditor}>
        <label>Описание задачи</label>
        <textarea
          className={styles.form__textarea}
          value={block.description ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { description: e.target.value })}
          placeholder="Например: Реализуйте функцию, которая возвращает n-ое число Фибоначчи"
          rows={3}
        />
        <div className={styles.form__wrapper}>
          <span>Язык программирования:</span>
          <select
            value={block.language ?? "javascript"}
            onChange={(e) => {
              const newLang = e.target.value as CodeLanguage;
              updateBlock(slideIndex, block.id, {
                language: newLang,
                startCode: getDefaultStarterCode(newLang),
              });
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.form__wrapper}>
          <span>Тип:</span>
          <select
            value={block.runnable ? "run" : "output"}
            onChange={(e) =>
              updateBlock(slideIndex, block.id, { runnable: e.target.value === "run" })
            }
          >
            <option value="run">С запуском (стартовый код + тест-кейсы)</option>
            <option value="output">Без запуска (задача на вывод)</option>
          </select>
        </div>
        {block.runnable ? (
          <>
            <label>
              Стартовый код
              {(block.language === "csharp" || block.language === "java") && (
                <span style={{ fontSize: "0.9em", color: "#666", marginLeft: "10px" }}>
                  (Для {block.language === "csharp" ? "C#" : "Java"} используйте класс{" "}
                  {block.language === "csharp" ? "Program" : "Solution"} со статическим методом
                  Main)
                </span>
              )}
            </label>
            <CodeEditor
              value={block.startCode ?? ""}
              onChange={(v) => updateBlock(slideIndex, block.id, { startCode: v })}
              language={block.language ?? "javascript"}
              height={220}
              className={styles.codeEditorWrap}
            />
            <div>
              <Button
                color="#9F0FA7"
                width="auto"
                textColor="#fff"
                text="+ Тест-кейс"
                onClick={addTestCase}
              />
              {(block.testCases ?? []).map((tc, i) => (
                <div key={i} className={styles.testCase}>
                  <input
                    value={tc.input}
                    onChange={(e) => updateTestCase(i, "input", e.target.value)}
                    placeholder="Входные данные (JSON): [2,1,4] или 5"
                  />
                  <input
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                    placeholder="Ожидаемый возврат (JSON): [1,2,4] или 5"
                  />
                </div>
              ))}
            </div>
            <div>
              <Button
                color="#9F0FA7"
                width="auto"
                textColor="#fff"
                text="+ Ограничение"
                onClick={addConstraint}
              />
              {(block.constraints ?? []).map((c, i) => (
                <div key={i} className={styles.form__wrapper}>
                  <select
                    value={c.type}
                    onChange={(e) =>
                      updateConstraint(i, e.target.value as CodeConstraintType, c.value)
                    }
                  >
                    <option value="maxTimeMs">Время &lt; N мс</option>
                    <option value="maxLines">Меньше N строк</option>
                    <option value="forbiddenTokens">Запрещённые слова</option>
                  </select>
                  {c.type === "maxTimeMs" && (
                    <input
                      type="number"
                      value={typeof c.value === "number" ? c.value : 1000}
                      onChange={(e) => updateConstraint(i, "maxTimeMs", Number(e.target.value))}
                    />
                  )}
                  {c.type === "maxLines" && (
                    <input
                      type="number"
                      value={typeof c.value === "number" ? c.value : 30}
                      onChange={(e) => updateConstraint(i, "maxLines", Number(e.target.value))}
                    />
                  )}
                  {c.type === "forbiddenTokens" && (
                    <input
                      value={(c.value as string[]).join(",")}
                      onChange={(e) =>
                        updateConstraint(
                          i,
                          "forbiddenTokens",
                          e.target.value.split(",").map((s) => s.trim())
                        )
                      }
                      placeholder="через запятую"
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <label>Ожидаемый вывод (задача на вывод)</label>
            <input
              className={styles.form__input}
              value={block.expectedOutput ?? ""}
              onChange={(e) =>
                updateBlock(slideIndex, block.id, { expectedOutput: e.target.value })
              }
              placeholder="Ожидаемый вывод"
            />
            <label>Код для ввода (в превью пользователь вводит код)</label>
            <textarea
              className={styles.form__textarea}
              placeholder="В превью: поле ввода кода"
              rows={2}
              readOnly
            />
          </>
        )}
      </div>
    );
  }

  if (block.type === "theoryQuestion") {
    const addOption = () => updateBlock(slideIndex, block.id, { options: [...block.options, ""] });
    const setOption = (i: number, v: string) => {
      const options = [...block.options];
      options[i] = v;
      updateBlock(slideIndex, block.id, { options });
    };

    return (
      <div className={styles.blockEditor}>
        <input
          className={styles.form__input}
          value={block.text ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { text: e.target.value })}
          placeholder="Текст вопроса"
        />
        <CodeEditor
          value={block.code ?? ""}
          onChange={(v) => updateBlock(slideIndex, block.id, { code: v })}
          language="javascript"
          height={120}
          className={styles.codeEditorWrap}
        />
        <input
          className={styles.form__input}
          value={block.imageUrl ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { imageUrl: e.target.value })}
          placeholder="URL изображения"
        />
        <label>Варианты ответа (правильный выберите ниже)</label>
        {block.options.map((opt, i) => (
          <div key={i} className={styles.form__wrapper}>
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Вариант ${i + 1}`}
              className={styles.form__input}
            />
            <label>
              <input
                type="radio"
                name={`correct_${block.id}`}
                checked={block.correctIndex === i}
                onChange={() => updateBlock(slideIndex, block.id, { correctIndex: i })}
              />
              Верно
            </label>
          </div>
        ))}
        <Button
          color="#9F0FA7"
          width="auto"
          textColor="#fff"
          text="+ Вариант"
          onClick={addOption}
        />
      </div>
    );
  }

  return null;
}

function PreviewBlockStatic({ block }: { block: SlideBlock }) {
  if (block.type === "text") return <p>{block.content || "(пусто)"}</p>;

  if (block.type === "codeExample")
    return (
      <CodeEditor
        value={block.code || ""}
        onChange={() => {}}
        language={block.language}
        readOnly
        height={200}
        className={styles.codeEditorWrap}
      />
    );

  if (block.type === "source")
    return (
      <p>
        <a href={block.url} target="_blank" rel="noopener noreferrer">
          {block.url || "Источник"}
        </a>
        {block.note && ` — ${block.note}`}
      </p>
    );

  if (block.type === "table") {
    return (
      <table className={styles.table}>
        <tbody>
          {block.cells.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (block.type === "image")
    return block.url ? (
      <img src={block.url} alt="" className={styles.previewImg} />
    ) : (
      <p>(изображение)</p>
    );

  if (block.type === "codeTask") return <p>Задача: {block.description || "—"}</p>;

  if (block.type === "theoryQuestion") return <p>Вопрос: {block.text || "—"}</p>;

  return null;
}
const extractFunctionName = (code: string, lang: CodeLanguage): string | null => {
  if (!code) return null;

  try {
    switch (lang) {
      case "javascript":
        const jsMatch = code.match(
          /function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>|let\s+(\w+)\s*=\s*\([^)]*\)\s*=>|var\s+(\w+)\s*=\s*\([^)]*\)\s*=>/
        );
        return jsMatch ? jsMatch[1] || jsMatch[2] || jsMatch[3] || jsMatch[4] : null;

      case "python":
        const pyMatch = code.match(/def\s+(\w+)\s*\(/);
        return pyMatch ? pyMatch[1] : null;

      case "golang":
        const goMatch = code.match(/func\s+(\w+)\s*\(/);
        return goMatch ? goMatch[1] : null;

      case "csharp":
        // Ищем метод в классе Program
        const csMatch = code.match(/public\s+static\s+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)/);
        return csMatch ? csMatch[1] : null;

      case "java":
        // Ищем статический метод в классе Kata
        const javaMatch = code.match(/public\s+static\s+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)/);
        return javaMatch ? javaMatch[1] : null;

      default:
        return null;
    }
  } catch (e) {
    console.error("Error extracting function name:", e);
    return null;
  }
};

const buildTestCode = (
  userCode: string,
  input: string,
  lang: CodeLanguage,
  funcName: string | null
): string => {
  if (!funcName) return userCode;

  let parsedInput: any;
  try {
    parsedInput = JSON.parse(input);
  } catch {
    parsedInput = input;
  }

  const isArrayInput = input.trim().startsWith("[") && input.trim().endsWith("]");
  const isStringInput = input.trim().startsWith('"') && input.trim().endsWith('"');
  const isNumberInput = !isNaN(Number(input)) && input.trim() !== "";

  switch (lang) {
    case "javascript":
      if (isArrayInput) {
        return `${userCode}\nconsole.log(JSON.stringify(${funcName}(${input})));`;
      } else {
        const args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
        const argsStr = args.map((arg: any) => JSON.stringify(arg)).join(", ");
        return `${userCode}\nconsole.log(JSON.stringify(${funcName}(${argsStr})));`;
      }

    case "python":
      if (isArrayInput) {
        return `${userCode}\nimport json\nprint(json.dumps(${funcName}(${input})))`;
      } else {
        const args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
        const argsStr = args.map((arg: any) => JSON.stringify(arg)).join(", ");
        return `${userCode}\nimport json\nprint(json.dumps(${funcName}(${argsStr})))`;
      }

    case "csharp":
      if (isArrayInput) {
        const arrayValues = parsedInput.map((v: any) => v).join(", ");
        return `${userCode}\nConsole.WriteLine(JsonSerializer.Serialize(Program.${funcName}(new int[] { ${arrayValues} })));`;
      } else {
        return `${userCode}\nConsole.WriteLine(JsonSerializer.Serialize(Program.${funcName}(${input})));`;
      }

    case "java":
      // Формируем аргументы для вызова функции
      let argsForCall = "";

      if (isArrayInput) {
        // Для массива
        const arrayValues = parsedInput.map((v: any) => v).join(", ");
        argsForCall = `new int[]{${arrayValues}}`;
      } else if (isStringInput) {
        // Для строки
        argsForCall = input;
      } else if (isNumberInput) {
        // Для числа
        argsForCall = input;
      } else if (input.includes(",")) {
        // Для нескольких аргументов
        argsForCall = input;
      } else {
        // Для одного аргумента
        argsForCall = input;
      }

      // Заменяем или добавляем main метод для тестирования
      if (userCode.includes("public static void main")) {
        // Если есть main метод, заменяем его содержимое
        return userCode.replace(
          /public static void main\(String\[\] args\)[\s\S]*?}/,
          `public static void main(String[] args) {
        // Тестовый вызов функции
        Object result = ${funcName}(${argsForCall});
        
        // Выводим результат в консоль в формате JSON
        if (result instanceof int[]) {
            int[] arr = (int[]) result;
            System.out.print("[");
            for (int i = 0; i < arr.length; i++) {
                System.out.print(arr[i]);
                if (i < arr.length - 1) System.out.print(", ");
            }
            System.out.println("]");
        } else {
            System.out.println(result);
        }
    }`
        );
      } else {
        // Если нет main метода, добавляем его
        return `${userCode}

public static void main(String[] args) {
    // Тестовый вызов функции
    Object result = ${funcName}(${argsForCall});
    
    // Выводим результат в консоль в формате JSON
    if (result instanceof int[]) {
        int[] arr = (int[]) result;
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            System.out.print(arr[i]);
            if (i < arr.length - 1) System.out.print(", ");
        }
        System.out.println("]");
    } else {
        System.out.println(result);
    }
}`;
      }

    case "golang":
      if (isArrayInput) {
        const arrayValues = parsedInput.map((v: any) => v).join(", ");
        return `${userCode}\n\nfunc main() { result := ${funcName}([]int{${arrayValues}}); jsonResult, _ := json.Marshal(result); fmt.Println(string(jsonResult)) }`;
      } else {
        return `${userCode}\n\nfunc main() { result := ${funcName}(${input}); jsonResult, _ := json.Marshal(result); fmt.Println(string(jsonResult)) }`;
      }

    default:
      return userCode;
  }
};

// Функция для сравнения выводов
const compareOutputs = (actual: any, expected: any): boolean => {
  if (actual == null && expected == null) return true;
  if (actual == null || expected == null) return false;

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    return actual.every((item, index) => JSON.stringify(item) === JSON.stringify(expected[index]));
  }

  if (typeof actual === "object" && typeof expected === "object") {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  return String(actual).trim() === String(expected).trim();
};

function PreviewCodeTask({
  block,
  testAnswer,
  setTestAnswer,
  testError,
  setTestError,
  onCorrect,
}: {
  block: CodeTaskBlock;
  testAnswer: string | number | undefined;
  setTestAnswer: (v: string | number) => void;
  testError: string | undefined;
  setTestError: (v: string) => void;
  onCorrect: () => void;
}) {
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Важно: используем текущий язык блока для стартового кода
  const userCode =
    typeof testAnswer === "string"
      ? testAnswer
      : block.runnable
        ? (block.startCode ?? getDefaultStarterCode(block.language ?? "javascript"))
        : "";

  const setUserCode = (code: string) => {
    setTestAnswer(code);
    setTestError("");
    setConsoleOutput(null);
  };

  const check = async () => {
    setTestError("");

    if (block.runnable) {
      if (block.testCases?.length) {
        const funcName = extractFunctionName(userCode, block.language ?? "javascript");

        if (!funcName) {
          setTestError(
            `Не удалось найти имя функции в коде для языка ${block.language}. Убедитесь, что функция определена правильно.`
          );
          return;
        }

        const results: { input: string; expected: string; actual: string; passed: boolean }[] = [];

        for (const tc of block.testCases) {
          if (!tc.input || !tc.expectedOutput) {
            setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
            return;
          }

          const codeToRun = buildTestCode(
            userCode,
            tc.input,
            block.language ?? "javascript",
            funcName
          );

          const res = await CodeService.executeCode({
            language: block.language ?? "javascript",
            code: codeToRun,
          });

          if (res.error) {
            setTestError(`Ошибка выполнения: ${res.error}`);
            return;
          }

          const actualOutput = (res.output || "").trim();
          let expectedOutput = (tc.expectedOutput || "").trim();

          let actualParsed: any;
          let expectedParsed: any;

          try {
            actualParsed = JSON.parse(actualOutput);
          } catch {
            actualParsed = actualOutput;
          }

          try {
            expectedParsed = JSON.parse(expectedOutput);
          } catch {
            expectedParsed = expectedOutput;
          }

          const passed = compareOutputs(actualParsed, expectedParsed);

          results.push({
            input: tc.input,
            expected: expectedOutput,
            actual: actualOutput,
            passed,
          });
        }

        const allPassed = results.every((r) => r.passed);

        if (allPassed) {
          onCorrect();
          setTestError("");
        } else {
          const failedTests = results
            .map((r, i) => {
              if (!r.passed) {
                return `Тест ${i + 1}: Вход: ${r.input}, Ожидалось: ${r.expected}, Получено: ${r.actual}`;
              }
              return null;
            })
            .filter(Boolean)
            .join("\n");

          setTestError(
            `Провалено ${results.filter((r) => !r.passed).length} из ${results.length} тестов:\n${failedTests}`
          );
        }
      } else {
        setTestError("Нет тест-кейсов для проверки");
      }
    } else if (!block.runnable) {
      const res = await CodeService.executeCode({
        language: block.language ?? "javascript",
        code: userCode,
      });
      const out = (res.output || "").trim();

      if (out === (block.expectedOutput || "").trim()) {
        onCorrect();
        setTestError("");
      } else {
        setTestError(`Неверно. Ожидалось: ${block.expectedOutput}, получено: ${out}`);
      }
    }
  };

  const runUserCode = async () => {
    setConsoleOutput(null);
    setIsRunning(true);
    try {
      const res = await CodeService.executeCode({
        language: block.language ?? "javascript",
        code: userCode,
      });
      setConsoleOutput(
        res.output || (res.error ? `Ошибка: ${res.error}` : "Код выполнен успешно (без вывода)")
      );
    } catch (e) {
      setConsoleOutput(`Ошибка выполнения: ${e}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={styles.codeTask}>
      <p className={styles.taskDescription}>{block.description}</p>
      <CodeEditor
        value={userCode}
        onChange={setUserCode}
        language={block.language ?? "javascript"}
        height={250}
        className={styles.codeEditorWrap}
      />
      <div className={styles.runButtons}>
        <Button
          color="#4CAF50"
          width="120px"
          textColor="#fff"
          text={isRunning ? "Запуск..." : "Запустить"}
          onClick={runUserCode}
          disabled={isRunning}
        />
        <Button
          color="#9F0FA7"
          width="120px"
          textColor="#fff"
          text="Проверить"
          onClick={check}
          disabled={isRunning}
        />
      </div>
      {consoleOutput !== null && (
        <div className={styles.consoleOutput}>
          <div className={styles.consoleHeader}>Консоль</div>
          <pre className={styles.consoleBody}>{consoleOutput}</pre>
        </div>
      )}
      {testError && (
        <div className={styles.testError}>
          <pre>{testError}</pre>
        </div>
      )}
    </div>
  );
}

function PreviewTheoryQuestion({
  block,
  testAnswer,
  setTestAnswer,
  onCorrect,
}: {
  block: TheoryQuestionBlock;
  testAnswer: string | number | undefined;
  setTestAnswer: (v: string | number) => void;
  onCorrect: () => void;
}) {
  const selected = typeof testAnswer === "number" ? testAnswer : -1;
  const submit = () => {
    if (selected === block.correctIndex) onCorrect();
  };

  return (
    <div>
      <p>{block.text}</p>
      {block.code && (
        <CodeEditor
          value={block.code}
          onChange={() => {}}
          language="javascript"
          readOnly
          height={120}
          className={styles.codeEditorWrap}
        />
      )}
      {block.imageUrl && <img src={block.imageUrl} alt="" className={styles.previewImg} />}
      <div>
        {block.options.map((opt, i) => (
          <label key={i} className={styles.radioOption}>
            <input
              type="radio"
              name={`theory_${block.id}`}
              checked={selected === i}
              onChange={() => setTestAnswer(i)}
            />
            {opt}
          </label>
        ))}
      </div>
      <Button
        color="#9F0FA7"
        width="120px"
        textColor="#fff"
        text="Ответить"
        onClick={submit}
        disabled={selected < 0}
      />
    </div>
  );
}

function PreviewBlock({
  block,
  slideId,
  runCode,
  codeRunOutput,
  codeRunLoading,
  testAnswer,
  setTestAnswer,
  testError,
  setTestError,
  onCorrect,
}: {
  block: SlideBlock;
  slideId: string;
  runCode: (id: string, lang: CodeLanguage, code: string) => void;
  codeRunOutput: string | undefined;
  codeRunLoading: boolean | undefined;
  testAnswer: string | number | undefined;
  setTestAnswer: (v: string | number) => void;
  testError: string | undefined;
  setTestError: (v: string) => void;
  onCorrect: () => void;
}) {
  if (block.type === "text") return <p>{block.content || ""}</p>;

  if (block.type === "codeExample") {
    return (
      <div>
        <CodeEditor
          value={block.code || ""}
          onChange={() => {}}
          language={block.language}
          readOnly
          height={200}
          className={styles.codeEditorWrap}
          onRun={block.runnable ? () => runCode(block.id, block.language, block.code) : undefined}
          runLoading={block.runnable && !!codeRunLoading}
        />
        {block.runnable && codeRunOutput != null && (
          <pre className={styles.codeOutput}>{codeRunOutput}</pre>
        )}
      </div>
    );
  }

  if (block.type === "source")
    return (
      <p>
        <a href={block.url} target="_blank" rel="noopener noreferrer">
          {block.url}
        </a>
        {block.note && ` — ${block.note}`}
      </p>
    );

  if (block.type === "table") {
    return (
      <table className={styles.table}>
        <tbody>
          {block.cells.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (block.type === "image")
    return block.url ? <img src={block.url} alt="" className={styles.previewImg} /> : null;

  if (block.type === "codeTask") {
    return (
      <PreviewCodeTask
        block={block}
        testAnswer={testAnswer}
        setTestAnswer={setTestAnswer}
        testError={testError}
        setTestError={setTestError}
        onCorrect={onCorrect}
      />
    );
  }

  if (block.type === "theoryQuestion") {
    return (
      <PreviewTheoryQuestion
        block={block}
        testAnswer={testAnswer}
        setTestAnswer={setTestAnswer}
        onCorrect={onCorrect}
      />
    );
  }

  return null;
}
