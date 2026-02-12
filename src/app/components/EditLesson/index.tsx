"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
// Используем более надежный генератор ID
const genId = () =>
  `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${performance.now()}`;

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

// Функция для удаления main метода из кода, который видит пользователь
const stripMainMethod = (code: string, language: CodeLanguage): string => {
  if (language === "java") {
    return code
      .replace(/public\s+static\s+void\s+main\s*\(String\[\]\s*args\)\s*\{[\s\S]*?\}\s*\n?/g, "")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();
  }
  if (language === "csharp") {
    return code
      .replace(/public\s+static\s+void\s+Main\s*\(string\[\]\s*args\)\s*\{[\s\S]*?\}\s*\n?/g, "")
      .trim();
  }
  return code;
};

// Функция для добавления main метода в Java код (для выполнения)
const addJavaMainMethod = (code: string, funcName: string | null, input: string = "5"): string => {
  if (!funcName) return code;

  if (code.includes("public static void main")) {
    return code.replace(
      /public\s+static\s+void\s+main\(String\[\]\s*args\)\s*\{[\s\S]*?\}/,
      `public static void main(String[] args) {
        try {
            System.out.println(${funcName}(${input}));
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }`
    );
  } else {
    const codeWithoutLastBrace = code.trim().replace(/\}\s*$/, "");
    return `${codeWithoutLastBrace}

    public static void main(String[] args) {
        try {
            System.out.println(${funcName}(${input}));
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}`;
  }
};

// Функция для создания тестового набора Java для множественных тест-кейсов
const buildJavaTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string }[],
  funcName: string | null
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      let input = tc.input;

      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = input;
      }

      let argsStr: string;
      if (Array.isArray(parsedInput)) {
        argsStr = parsedInput
          .map((arg) => {
            if (typeof arg === "string") return `"${arg}"`;
            if (typeof arg === "boolean") return arg;
            if (typeof arg === "object") return JSON.stringify(arg);
            return arg;
          })
          .join(", ");
      } else {
        argsStr = typeof parsedInput === "string" ? `"${parsedInput}"` : String(parsedInput);
      }

      return `
        // Тест ${index + 1}
        try {
            Object result = ${funcName}(${argsStr});
            System.out.println("===TEST_START_" + ${index + 1} + "===");
            if (result == null) {
                System.out.print("null");
            } else if (result instanceof String) {
                System.out.print("\\"");
                System.out.print(result);
                System.out.print("\\"");
            } else if (result.getClass().isArray()) {
                if (result instanceof int[]) {
                    System.out.print(java.util.Arrays.toString((int[])result));
                } else if (result instanceof Integer[]) {
                    System.out.print(java.util.Arrays.toString((Integer[])result));
                } else if (result instanceof String[]) {
                    System.out.print(java.util.Arrays.toString((String[])result));
                } else {
                    System.out.print(java.util.Arrays.toString((Object[])result));
                }
            } else {
                System.out.print(result);
            }
            System.out.println("===TEST_END_" + ${index + 1} + "===");
        } catch (Exception e) {
            System.out.println("===TEST_START_" + ${index + 1} + "===");
            System.out.println("ERROR: " + e.getMessage());
            System.out.println("===TEST_END_" + ${index + 1} + "===");
        }`;
    })
    .join("\n");

  if (userCode.includes("public static void main")) {
    return userCode.replace(
      /public\s+static\s+void\s+main\(String\[\]\s*args\)\s*\{[\s\S]*?\}/,
      `public static void main(String[] args) {
${testCasesCode}
    }`
    );
  } else {
    const codeWithoutLastBrace = userCode.trim().replace(/\}\s*$/, "");
    return `${codeWithoutLastBrace}

    public static void main(String[] args) {
${testCasesCode}
    }
}`;
  }
};

const getDefaultStarterCode = (language: CodeLanguage): string => {
  switch (language) {
    case "csharp":
      return `using System;

public class Program
{
    public static int YourFunction(int n)
    {
        // Ваш код здесь
        return n + 1;
    }
}`;
    case "java":
      return `public class Main {
    public static int yourFunction(int n) {
        // Ваш код здесь
        return n + 1;
    }
}`;
    case "python":
      return "def your_function(n):\n    # Ваш код здесь\n    return 0";
    case "golang":
      return `package main

func yourFunction(n int) int {
    // Ваш код здесь
    return 0
}`;
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

// Компонент-обертка для CodeEditor для предотвращения проблем с Monaco
function StableCodeEditor({
  value,
  onChange,
  language,
  height,
  readOnly,
  onRun,
  runLoading,
  key,
}: {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  height: number;
  readOnly?: boolean;
  onRun?: () => void;
  runLoading?: boolean;
  key?: string;
}) {
  const editorRef = useRef<any>(null);

  // Уникальный ID для каждого экземпляра редактора
  const editorId = useRef(`editor_${genId()}`).current;

  // Используем useEffect для очистки при размонтировании
  useEffect(() => {
    return () => {
      // Очищаем ссылку при размонтировании
      if (editorRef.current) {
        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.codeEditorWrapper} key={key || editorId}>
      <CodeEditor
        value={value}
        onChange={onChange}
        language={language}
        height={height}
        readOnly={readOnly}
        onRun={onRun}
        runLoading={runLoading}
      />
    </div>
  );
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

  // Добавляем ref для отслеживания перемещения блоков
  const isMovingBlock = useRef(false);

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
        ...next[slideIndex],
        blocks: [...next[slideIndex].blocks, block],
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
      // Пересчитываем order для всех блоков
      const reorderedBlocks = blocks.map((b, idx) => ({ ...b, order: idx })) as SlideBlock[];

      next[slideIndex] = { ...slide, blocks: reorderedBlocks };
      return next;
    });
  }, []);

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ moveBlock - теперь не вызывает ошибку с Monaco
  const moveBlock = useCallback((slideIndex: number, blockId: string, direction: "up" | "down") => {
    // Устанавливаем флаг, что происходит перемещение
    isMovingBlock.current = true;

    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      // Сортируем блоки по order
      const sorted = sortBlocks(slide.blocks);
      const currentIndex = sorted.findIndex((b) => b.id === blockId);

      if (currentIndex === -1) return prev;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= sorted.length) return prev;

      // Создаем новый массив блоков с обновленными order
      const newBlocks = sorted.map((block, index) => {
        if (index === currentIndex) {
          return { ...block, order: newIndex };
        }
        if (index === newIndex) {
          return { ...block, order: currentIndex };
        }
        return { ...block };
      });

      // Сортируем по новому order
      const finalBlocks = sortBlocks(newBlocks);

      next[slideIndex] = { ...slide, blocks: finalBlocks };
      return next;
    });

    // Сбрасываем флаг после обновления состояния
    setTimeout(() => {
      isMovingBlock.current = false;
    }, 0);
  }, []);

  const runCode = useCallback(async (blockId: string, language: CodeLanguage, code: string) => {
    setCodeRunLoading((prev) => ({ ...prev, [blockId]: true }));
    setCodeRunOutput((prev) => ({ ...prev, [blockId]: "" }));
    try {
      const res = await CodeService.executeCode({ language, code });
      const text = res.error ? `Ошибка: ${res.error}` : res.output || "";
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: text }));
    } catch (error) {
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: `Ошибка: ${error}` }));
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
                      key={`${block.id}_${block.order}`} // Важно: добавляем order в key
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
              ) : selectedSlide ? (
                sortBlocks(selectedSlide.blocks ?? []).map((b) => (
                  <PreviewBlockStatic key={b.id} block={b} />
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
            onClick={() => setPreviewMode(true)}
          />
          <Button
            color="#9F0FA7"
            width="200px"
            textColor="#fff"
            text="Сохранить изменения"
            onClick={saveLesson}
          />
        </div>
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
        <StableCodeEditor
          key={`${block.id}_code`}
          value={block.code}
          onChange={(v) => updateBlock(slideIndex, block.id, { code: v })}
          language={block.language}
          height={220}
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
    const deleteTestCase = (i: number) => {
      const testCases = [...(block.testCases ?? [])];
      testCases.splice(i, 1);
      updateBlock(slideIndex, block.id, { testCases });
    };
    const addConstraint = () => {
      const constraints = [
        ...(block.constraints ?? []),
        { type: "maxTimeMs" as CodeConstraintType, value: 1000 },
      ];
      updateBlock(slideIndex, block.id, { constraints });
    };
    const updateConstraint = (
      i: number,
      type: CodeConstraintType,
      value: number | string[] | boolean
    ) => {
      const constraints = [...(block.constraints ?? [])];
      if (!constraints[i]) constraints[i] = { type: "maxTimeMs", value: 1000 };
      constraints[i] = { type, value };
      updateBlock(slideIndex, block.id, { constraints });
    };
    const deleteConstraint = (i: number) => {
      const constraints = [...(block.constraints ?? [])];
      constraints.splice(i, 1);
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
                  (Для {block.language === "csharp" ? "C#" : "Java"} код автоматически оборачивается
                  в main метод при выполнении)
                </span>
              )}
            </label>
            <StableCodeEditor
              key={`${block.id}_startcode`}
              value={stripMainMethod(block.startCode ?? "", block.language ?? "javascript")}
              onChange={(v) => updateBlock(slideIndex, block.id, { startCode: v })}
              language={block.language ?? "javascript"}
              height={220}
            />

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>Тест-кейсы</h4>
                <Button
                  color="#9F0FA7"
                  width="auto"
                  textColor="#fff"
                  text="+ Добавить тест-кейс"
                  onClick={addTestCase}
                />
              </div>
              {(block.testCases ?? []).map((tc, i) => (
                <div key={i} className={styles.testCase}>
                  <div className={styles.testCaseHeader}>
                    <span className={styles.testCaseTitle}>Тест #{i + 1}</span>
                    <button className={styles.deleteButton} onClick={() => deleteTestCase(i)}>
                      ✕
                    </button>
                  </div>
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

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>Ограничения</h4>
                <Button
                  color="#FFA500"
                  width="auto"
                  textColor="#fff"
                  text="+ Добавить ограничение"
                  onClick={addConstraint}
                />
              </div>
              {(block.constraints ?? []).map((c, i) => (
                <div key={i} className={styles.constraint}>
                  <div className={styles.constraintHeader}>
                    <span className={styles.constraintTitle}>
                      {c.type === "maxTimeMs" && "⏱ Ограничение по времени"}
                      {c.type === "maxLines" && "📏 Ограничение по строкам"}
                      {c.type === "forbiddenTokens" && "🚫 Запрещённые слова"}
                      {c.type === "noComments" && "💬 Без комментариев"}
                      {c.type === "noConsoleLog" && "📢 Без console.log"}
                      {c.type === "maxComplexity" && "🔄 Цикломатическая сложность"}
                      {c.type === "memoryLimit" && "💾 Ограничение по памяти"}
                      {c.type === "requiredKeywords" && "🔑 Обязательные ключевые слова"}
                    </span>
                    <button className={styles.deleteButton} onClick={() => deleteConstraint(i)}>
                      ✕
                    </button>
                  </div>
                  <div className={styles.constraintContent}>
                    <select
                      value={c.type}
                      onChange={(e) => {
                        const newType = e.target.value as CodeConstraintType;
                        let defaultValue: any = 1000;
                        if (newType === "maxLines") defaultValue = 30;
                        if (newType === "forbiddenTokens") defaultValue = [];
                        if (newType === "noComments") defaultValue = true;
                        if (newType === "noConsoleLog") defaultValue = true;
                        if (newType === "maxComplexity") defaultValue = 5;
                        if (newType === "memoryLimit") defaultValue = 256;
                        if (newType === "requiredKeywords") defaultValue = [];
                        updateConstraint(i, newType, defaultValue);
                      }}
                    >
                      <option value="maxTimeMs">⏱ Время выполнения (мс)</option>
                      <option value="maxLines">📏 Максимум строк кода</option>
                      <option value="forbiddenTokens">🚫 Запрещённые слова</option>
                      <option value="noComments">💬 Без комментариев</option>
                      <option value="noConsoleLog">📢 Без console.log</option>
                      <option value="maxComplexity">🔄 Макс. цикломатическая сложность</option>
                      <option value="memoryLimit">💾 Ограничение по памяти (МБ)</option>
                      <option value="requiredKeywords">🔑 Обязательные ключевые слова</option>
                    </select>

                    {c.type === "maxTimeMs" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 1000}
                        onChange={(e) => updateConstraint(i, "maxTimeMs", Number(e.target.value))}
                        min="1"
                        max="10000"
                      />
                    )}

                    {c.type === "maxLines" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 30}
                        onChange={(e) => updateConstraint(i, "maxLines", Number(e.target.value))}
                        min="1"
                        max="500"
                      />
                    )}

                    {c.type === "forbiddenTokens" && (
                      <input
                        value={Array.isArray(c.value) ? (c.value as string[]).join(", ") : ""}
                        onChange={(e) =>
                          updateConstraint(
                            i,
                            "forbiddenTokens",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="for, while, sort, reverse"
                      />
                    )}

                    {c.type === "noComments" && (
                      <div className={styles.checkboxWrapper}>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.value === true}
                            onChange={(e) => updateConstraint(i, "noComments", e.target.checked)}
                          />
                          Запретить комментарии
                        </label>
                      </div>
                    )}

                    {c.type === "noConsoleLog" && (
                      <div className={styles.checkboxWrapper}>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.value === true}
                            onChange={(e) => updateConstraint(i, "noConsoleLog", e.target.checked)}
                          />
                          Запретить console.log
                        </label>
                      </div>
                    )}

                    {c.type === "maxComplexity" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 5}
                        onChange={(e) =>
                          updateConstraint(i, "maxComplexity", Number(e.target.value))
                        }
                        min="1"
                        max="20"
                      />
                    )}

                    {c.type === "memoryLimit" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 256}
                        onChange={(e) => updateConstraint(i, "memoryLimit", Number(e.target.value))}
                        min="16"
                        max="1024"
                      />
                    )}

                    {c.type === "requiredKeywords" && (
                      <input
                        value={Array.isArray(c.value) ? (c.value as string[]).join(", ") : ""}
                        onChange={(e) =>
                          updateConstraint(
                            i,
                            "requiredKeywords",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="function, return, const"
                      />
                    )}
                  </div>
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
    const deleteOption = (i: number) => {
      const options = [...block.options];
      options.splice(i, 1);
      if (block.correctIndex === i) {
        updateBlock(slideIndex, block.id, { options, correctIndex: 0 });
      } else if (block.correctIndex > i) {
        updateBlock(slideIndex, block.id, { options, correctIndex: block.correctIndex - 1 });
      } else {
        updateBlock(slideIndex, block.id, { options });
      }
    };

    return (
      <div className={styles.blockEditor}>
        <input
          className={styles.form__input}
          value={block.text ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { text: e.target.value })}
          placeholder="Текст вопроса"
        />
        <StableCodeEditor
          key={`${block.id}_code`}
          value={block.code ?? ""}
          onChange={(v) => updateBlock(slideIndex, block.id, { code: v })}
          language="javascript"
          height={120}
        />
        <input
          className={styles.form__input}
          value={block.imageUrl ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { imageUrl: e.target.value })}
          placeholder="URL изображения"
        />

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Варианты ответа</h4>
            <Button
              color="#9F0FA7"
              width="auto"
              textColor="#fff"
              text="+ Добавить вариант"
              onClick={addOption}
            />
          </div>
          {block.options.map((opt, i) => (
            <div key={i} className={styles.option}>
              <div className={styles.optionHeader}>
                <span className={styles.optionTitle}>Вариант {i + 1}</span>
                <button className={styles.deleteButton} onClick={() => deleteOption(i)}>
                  ✕
                </button>
              </div>
              <div className={styles.optionContent}>
                <input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Вариант ${i + 1}`}
                  className={styles.form__input}
                />
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={`correct_${block.id}`}
                    checked={block.correctIndex === i}
                    onChange={() => updateBlock(slideIndex, block.id, { correctIndex: i })}
                  />
                  Правильный ответ
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function PreviewBlockStatic({ block }: { block: SlideBlock }) {
  if (block.type === "text") return <p>{block.content || "(пусто)"}</p>;

  if (block.type === "codeExample")
    return (
      <StableCodeEditor
        key={`${block.id}_preview`}
        value={block.code || ""}
        onChange={() => {}}
        language={block.language}
        readOnly
        height={200}
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
        const csMatch = code.match(/public\s+static\s+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)/);
        return csMatch ? csMatch[1] : null;

      case "java":
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
        return `${userCode}\n\npublic class Runner {\n    public static void Main() {\n        Console.WriteLine(JsonSerializer.Serialize(Program.${funcName}(new int[] { ${arrayValues} })));\n    }\n}`;
      } else {
        return `${userCode}\n\npublic class Runner {\n    public static void Main() {\n        Console.WriteLine(JsonSerializer.Serialize(Program.${funcName}(${input})));\n    }\n}`;
      }

    case "java":
      return addJavaMainMethod(userCode, funcName, input);

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

interface ConstraintResult {
  type: CodeConstraintType;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  value?: number | string[] | boolean;
}

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
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [constraintResults, setConstraintResults] = useState<ConstraintResult[] | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const fullCodeForExecution =
    typeof testAnswer === "string" && testAnswer !== ""
      ? testAnswer
      : (block.startCode ?? getDefaultStarterCode(block.language ?? "javascript"));

  const displayCode = stripMainMethod(fullCodeForExecution, block.language ?? "javascript");

  const setUserCode = (code: string) => {
    setTestAnswer(code);
    setTestError("");
    setConsoleOutput(null);
    setTestResults(null);
    setConstraintResults(null);
    setExecutionTime(null);
  };

  const runUserCode = async () => {
    setConsoleOutput(null);
    setIsRunning(true);
    try {
      const funcName = extractFunctionName(fullCodeForExecution, block.language ?? "javascript");

      let codeToRun = fullCodeForExecution;

      if (block.language === "java") {
        codeToRun = addJavaMainMethod(fullCodeForExecution, funcName, "5");
      }

      const res = await CodeService.executeCode({
        language: block.language ?? "javascript",
        code: codeToRun,
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

  const countCodeLines = (code: string): number => {
    return code
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("//") &&
          !line.startsWith("/*") &&
          !line.startsWith("*") &&
          !line.startsWith("#")
      ).length;
  };

  const hasComments = (code: string): boolean => {
    const singleLineComments =
      code.split("\n").filter((line) => line.trim().startsWith("//") || line.trim().startsWith("#"))
        .length > 0;

    const multiLineComments = code.includes("/*") && code.includes("*/");
    const pythonMultiLine = code.includes('"""') && code.split('"""').length > 2;

    return singleLineComments || multiLineComments || pythonMultiLine;
  };

  const hasConsoleLog = (code: string): boolean => {
    return (
      code.includes("console.log") ||
      code.includes("console.error") ||
      code.includes("console.warn") ||
      code.includes("console.info") ||
      code.includes("print(") ||
      code.includes("System.out.println") ||
      code.includes("Console.WriteLine")
    );
  };

  const calculateComplexity = (code: string): number => {
    let complexity = 1;

    const complexityKeywords = [
      "if ",
      "else if",
      "else",
      "for ",
      "while ",
      "do ",
      "case ",
      "catch ",
      "||",
      "&&",
      "? :",
      "??",
      "switch",
      "?",
    ];

    complexityKeywords.forEach((keyword) => {
      const regex = new RegExp(keyword, "g");
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  };

  const hasRequiredKeywords = (code: string, keywords: string[]): boolean => {
    return keywords.every(
      (keyword) => keyword.trim() && code.toLowerCase().includes(keyword.toLowerCase().trim())
    );
  };

  const checkConstraints = async (
    code: string,
    constraints: CodeTaskBlock["constraints"]
  ): Promise<ConstraintResult[]> => {
    const results: ConstraintResult[] = [];

    for (const constraint of constraints || []) {
      switch (constraint.type) {
        case "maxLines": {
          const maxLines = constraint.value as number;
          const actualLines = countCodeLines(code);
          results.push({
            type: "maxLines",
            name: "📏 Максимум строк кода",
            passed: actualLines <= maxLines,
            expected: `≤ ${maxLines} строк`,
            actual: `${actualLines} строк`,
            value: maxLines,
          });
          break;
        }

        case "forbiddenTokens": {
          const forbidden = constraint.value as string[];
          const passed = !forbidden.some(
            (token) => token.trim() && code.toLowerCase().includes(token.toLowerCase().trim())
          );
          results.push({
            type: "forbiddenTokens",
            name: "🚫 Запрещённые слова",
            passed,
            expected: forbidden.filter((t) => t.trim()).join(", ") || "нет",
            actual: passed ? "не используются" : "используются",
            value: forbidden,
          });
          break;
        }

        case "noComments": {
          const passed = !hasComments(code);
          results.push({
            type: "noComments",
            name: "💬 Без комментариев",
            passed,
            expected: "без комментариев",
            actual: passed ? "нет комментариев" : "есть комментарии",
            value: constraint.value,
          });
          break;
        }

        case "noConsoleLog": {
          const passed = !hasConsoleLog(code);
          results.push({
            type: "noConsoleLog",
            name: "📢 Без отладочного вывода",
            passed,
            expected: "без console.log/print",
            actual: passed ? "нет" : "используется",
            value: constraint.value,
          });
          break;
        }

        case "maxComplexity": {
          const maxComplexity = constraint.value as number;
          const actualComplexity = calculateComplexity(code);
          results.push({
            type: "maxComplexity",
            name: "🔄 Цикломатическая сложность",
            passed: actualComplexity <= maxComplexity,
            expected: `≤ ${maxComplexity}`,
            actual: `${actualComplexity}`,
            value: maxComplexity,
          });
          break;
        }

        case "memoryLimit": {
          const memoryLimit = constraint.value as number;
          const codeSize = new Blob([code]).size / 1024;
          const estimatedMemory = Math.round(codeSize * 2);

          results.push({
            type: "memoryLimit",
            name: "💾 Использование памяти",
            passed: estimatedMemory <= memoryLimit,
            expected: `≤ ${memoryLimit} МБ`,
            actual: `~${estimatedMemory} МБ`,
            value: memoryLimit,
          });
          break;
        }

        case "requiredKeywords": {
          const keywords = constraint.value as string[];
          const passed = hasRequiredKeywords(code, keywords);
          results.push({
            type: "requiredKeywords",
            name: "🔑 Обязательные ключевые слова",
            passed,
            expected: keywords.filter((k) => k.trim()).join(", ") || "нет",
            actual: passed ? "все присутствуют" : "отсутствуют",
            value: keywords,
          });
          break;
        }

        case "maxTimeMs": {
          const maxTime = constraint.value as number;

          try {
            const funcName = extractFunctionName(code, block.language ?? "javascript");
            let codeToRun = code;

            if (block.language === "java" && funcName) {
              codeToRun = addJavaMainMethod(code, funcName, "5");
            }

            const startTime = performance.now();
            await CodeService.executeCode({
              language: block.language ?? "javascript",
              code: codeToRun,
            });
            const endTime = performance.now();
            const actualTime = Math.round(endTime - startTime);

            setExecutionTime(actualTime);

            results.push({
              type: "maxTimeMs",
              name: "⏱ Время выполнения",
              passed: actualTime <= maxTime,
              expected: `≤ ${maxTime} мс`,
              actual: `${actualTime} мс`,
              value: maxTime,
            });
          } catch {
            results.push({
              type: "maxTimeMs",
              name: "⏱ Время выполнения",
              passed: false,
              expected: `≤ ${maxTime} мс`,
              actual: "Ошибка выполнения",
              value: maxTime,
            });
          }
          break;
        }
      }
    }

    return results;
  };

  const check = async () => {
    setTestError("");
    setTestResults(null);
    setConstraintResults(null);
    setExecutionTime(null);

    if (block.runnable) {
      if (block.testCases?.length) {
        const funcName = extractFunctionName(fullCodeForExecution, block.language ?? "javascript");

        if (!funcName) {
          setTestError(
            `Не удалось найти имя функции в коде для языка ${block.language}. Убедитесь, что функция определена правильно.`
          );
          return;
        }

        let results: { input: string; expected: string; actual: string; passed: boolean }[] = [];

        if (block.language === "java") {
          const codeToRun = buildJavaTestSuite(fullCodeForExecution, block.testCases, funcName);

          const res = await CodeService.executeCode({
            language: "java",
            code: codeToRun,
          });

          if (res.error) {
            setTestError(`Ошибка выполнения: ${res.error}`);
            return;
          }

          const output = res.output || "";
          results = [];

          for (let i = 0; i < block.testCases.length; i++) {
            const testNum = i + 1;
            const pattern = new RegExp(
              `===TEST_START_${testNum}===(.*?)===TEST_END_${testNum}===`,
              "s"
            );
            const match = output.match(pattern);

            let actual = match ? match[1].trim() : "NO_OUTPUT";
            const expected = block.testCases[i].expectedOutput.trim();

            if (actual.startsWith('"') && actual.endsWith('"')) {
              actual = actual.slice(1, -1);
            }

            let actualParsed: any;
            let expectedParsed: any;

            try {
              actualParsed = JSON.parse(actual);
            } catch {
              actualParsed = actual;
            }

            try {
              expectedParsed = JSON.parse(expected);
            } catch {
              expectedParsed = expected;
            }

            const passed = compareOutputs(actualParsed, expectedParsed);

            results.push({
              input: block.testCases[i].input,
              expected,
              actual,
              passed,
            });
          }
        } else {
          for (const tc of block.testCases) {
            if (!tc.input || !tc.expectedOutput) {
              setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
              return;
            }

            const codeToRun = buildTestCode(
              fullCodeForExecution,
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
        }

        setTestResults(results);

        let constraintCheckResults: ConstraintResult[] = [];
        if (block.constraints?.length) {
          constraintCheckResults = await checkConstraints(fullCodeForExecution, block.constraints);
          setConstraintResults(constraintCheckResults);
        }

        const allTestsPassed = results.every((r) => r.passed);
        const allConstraintsPassed = constraintCheckResults.every((c) => c.passed);

        if (allTestsPassed && allConstraintsPassed) {
          onCorrect();
          setTestError("");
        } else {
          const failedTests = results
            .filter((r) => !r.passed)
            .map(
              (r, i) =>
                `Тест ${i + 1}: ${r.input} → ожидалось: ${r.expected}, получено: ${r.actual}`
            );

          const failedConstraints = constraintCheckResults
            .filter((c) => !c.passed)
            .map((c) => `${c.name}: ожидалось ${c.expected}, получено ${c.actual}`);

          const errorMessages = [];

          if (failedTests.length > 0) {
            errorMessages.push(`❌ Провалено тестов: ${failedTests.length} из ${results.length}`);
            errorMessages.push(...failedTests);
          }

          if (failedConstraints.length > 0) {
            errorMessages.push(`\n❌ Не пройдены ограничения:`);
            errorMessages.push(...failedConstraints);
          }

          setTestError(errorMessages.join("\n"));
        }
      } else {
        setTestError("Нет тест-кейсов для проверки");
      }
    } else if (!block.runnable) {
      const res = await CodeService.executeCode({
        language: block.language ?? "javascript",
        code: fullCodeForExecution,
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

  return (
    <div className={styles.codeTask}>
      <p className={styles.taskDescription}>{block.description}</p>

      <StableCodeEditor
        key={`${block.id}_task_${testAnswer}`}
        value={displayCode}
        onChange={setUserCode}
        language={block.language ?? "javascript"}
        height={250}
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

      {testResults && (
        <div className={styles.testResults}>
          <div className={styles.resultsHeader}>
            <h4>📊 Результаты тестирования</h4>
            <span className={styles.testSummary}>
              Пройдено: {testResults.filter((r) => r.passed).length} / {testResults.length}
            </span>
          </div>
          <div className={styles.testCasesList}>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`${styles.testCaseResult} ${result.passed ? styles.passed : styles.failed}`}
              >
                <div className={styles.testCaseResultHeader}>
                  <span className={styles.testNumber}>Тест #{index + 1}</span>
                  <span className={styles.testStatus}>
                    {result.passed ? "✅ Пройден" : "❌ Провален"}
                  </span>
                </div>
                <div className={styles.testCaseDetails}>
                  <div>Вход: {result.input}</div>
                  <div>Ожидалось: {result.expected}</div>
                  <div>Получено: {result.actual}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {constraintResults && constraintResults.length > 0 && (
        <div className={styles.constraintResults}>
          <div className={styles.resultsHeader}>
            <h4>🎯 Проверка ограничений</h4>
            <span className={styles.constraintSummary}>
              Выполнено: {constraintResults.filter((c) => c.passed).length} /{" "}
              {constraintResults.length}
            </span>
          </div>
          <div className={styles.constraintsList}>
            {constraintResults.map((constraint, index) => (
              <div
                key={index}
                className={`${styles.constraintResult} ${constraint.passed ? styles.passed : styles.failed}`}
              >
                <div className={styles.constraintResultHeader}>
                  <span className={styles.constraintName}>{constraint.name}</span>
                  <span className={styles.constraintStatus}>{constraint.passed ? "✅" : "❌"}</span>
                </div>
                <div className={styles.constraintDetails}>
                  <div>Ожидалось: {constraint.expected}</div>
                  <div>Получено: {constraint.actual}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    <div className={styles.theoryQuestion}>
      <p className={styles.questionText}>{block.text}</p>
      {block.code && (
        <StableCodeEditor
          key={`${block.id}_theory_preview`}
          value={block.code}
          onChange={() => {}}
          language="javascript"
          readOnly
          height={120}
        />
      )}
      {block.imageUrl && <img src={block.imageUrl} alt="" className={styles.previewImg} />}
      <div className={styles.optionsList}>
        {block.options.map((opt, i) => (
          <label key={i} className={styles.radioOption}>
            <input
              type="radio"
              name={`theory_${block.id}`}
              checked={selected === i}
              onChange={() => setTestAnswer(i)}
            />
            <span className={styles.optionText}>{opt}</span>
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
        <StableCodeEditor
          key={`${block.id}_preview_example`}
          value={block.code || ""}
          onChange={() => {}}
          language={block.language}
          readOnly
          height={200}
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
        key={`${block.id}_preview_task`}
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
        key={`${block.id}_preview_theory`}
        block={block}
        testAnswer={testAnswer}
        setTestAnswer={setTestAnswer}
        onCorrect={onCorrect}
      />
    );
  }

  return null;
}
