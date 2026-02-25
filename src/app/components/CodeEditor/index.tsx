"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import styles from "./index.module.scss";

import type { CodeLanguage } from "@/app/http/codeService";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
  /** При наличии показывается зелёный треугольник "Запуск" справа сверху */
  onRun?: () => void;
  runLoading?: boolean;
}

const KEYWORDS: Record<CodeLanguage, string[]> = {
  javascript: [
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "this",
    "new",
    "try",
    "catch",
    "finally",
    "switch",
    "case",
    "break",
    "continue",
    "typeof",
    "instanceof",
    "console.log",
    "Array",
    "Object",
    "String",
    "Number",
    "Boolean",
    "import",
    "export",
    "default",
    "from",
    "as",
    "async",
    "await",
  ],
  python: [
    "def",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "return",
    "import",
    "from",
    "as",
    "class",
    "try",
    "except",
    "finally",
    "with",
    "print",
    "len",
    "range",
    "enumerate",
    "zip",
    "open",
    "None",
    "True",
    "False",
    "and",
    "or",
    "not",
    "in",
    "is",
    "lambda",
    "async",
    "await",
    "yield",
    "global",
    "nonlocal",
  ],
  java: [
    "public",
    "private",
    "protected",
    "class",
    "void",
    "static",
    "final",
    "if",
    "else",
    "for",
    "while",
    "return",
    "new",
    "try",
    "catch",
    "System.out.println",
    "String",
    "int",
    "double",
    "boolean",
    "this",
    "super",
    "extends",
    "implements",
    "interface",
    "enum",
    "package",
    "import",
    "throws",
    "throw",
    "instanceof",
  ],
  csharp: [
    "public",
    "private",
    "protected",
    "class",
    "void",
    "static",
    "readonly",
    "if",
    "else",
    "for",
    "foreach",
    "while",
    "return",
    "using",
    "namespace",
    "Console.WriteLine",
    "string",
    "int",
    "bool",
    "var",
    "get",
    "set",
    "value",
    "this",
    "base",
    "virtual",
    "override",
    "abstract",
    "sealed",
    "partial",
    "enum",
    "interface",
  ],
  golang: [
    "func",
    "var",
    "const",
    "if",
    "else",
    "for",
    "range",
    "return",
    "package",
    "import",
    "type",
    "struct",
    "interface",
    "go",
    "defer",
    "chan",
    "map",
    "make",
    "new",
    "fmt.Println",
    "len",
    "cap",
    "append",
    "select",
    "case",
    "default",
    "fallthrough",
  ],
  cpp: [
    "int",
    "char",
    "float",
    "double",
    "void",
    "class",
    "public",
    "private",
    "protected",
    "if",
    "else",
    "for",
    "while",
    "return",
    "new",
    "delete",
    "cout",
    "cin",
    "endl",
    "std",
    "using",
    "namespace",
    "virtual",
    "override",
    "const",
    "static",
    "template",
    "typename",
    "include",
    "define",
    "ifdef",
    "ifndef",
    "endif",
  ],
};

const COLORS = {
  background: "#0D1117",
  surface: "#161B22",
  text: "#E6EDF3",
  keyword: "#FF79C6",
  string: "#A6E22E",
  number: "#E6DB74",
  comment: "#7E8C9A",
  function: "#66D9EF",
  type: "#A6E22E",
  operator: "#66D9EF",
  punctuation: "#E6EDF3",
  accent: "#FF79C6",
  selection: "#264F78",
  lineNumber: "#6E7681",
  autocompleteBg: "#1F2937",
  autocompleteBorder: "#374151",
  autocompleteSelected: "#2D3748",
};

export default function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = 240,
  className,
  onRun,
  runLoading = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 });
  const [cursorVisible, setCursorVisible] = useState(true);

  // Мигание курсора
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Получение текущего слова
  const getCurrentWord = useCallback((text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos);
    const afterCursor = text.slice(pos);

    const beforeMatch = beforeCursor.match(/[a-zA-Z0-9_.]*$/);
    const afterMatch = afterCursor.match(/^[a-zA-Z0-9_]*/);

    return (beforeMatch ? beforeMatch[0] : "") + (afterMatch ? afterMatch[0] : "");
  }, []);

  // Обновление автокомплита
  useEffect(() => {
    const word = getCurrentWord(value, selection.start);

    if (word.length >= 2 && !readOnly) {
      const suggestions = (KEYWORDS[language] || [])
        .filter(
          (keyword) => keyword.toLowerCase().startsWith(word.toLowerCase()) && keyword !== word
        )
        .slice(0, 6);

      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
      setSelectedSuggestion(0);
    } else {
      setShowAutocomplete(false);
    }
  }, [value, selection.start, language, readOnly]);

  // Вставка сниппета
  const insertSnippet = useCallback(
    (snippet: string) => {
      const beforeCursor = value.slice(0, selection.start);
      const afterCursor = value.slice(selection.end);
      const word = getCurrentWord(value, selection.start);

      const newText = beforeCursor.slice(0, -word.length) + snippet + afterCursor;

      onChange(newText);

      const newPosition = beforeCursor.length - word.length + snippet.length;

      setSelection({ start: newPosition, end: newPosition });
      setShowAutocomplete(false);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, selection, onChange]
  );

  // Обновление позиции курсора
  const handleSelectionChange = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      setSelection({ start, end });

      // Вычисляем позицию курсора (строка и колонка)
      const textBeforeCursor = value.slice(0, start);
      const lines = textBeforeCursor.split("\n");
      const line = lines.length - 1;
      const column = lines[lines.length - 1]?.length || 0;

      setCursorPosition({ line, column });
    },
    [value]
  );

  // Обработка клавиш
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;

      if (showAutocomplete) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedSuggestion((prev) =>
            prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
          );

          return;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));

          return;
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();

          if (autocompleteSuggestions[selectedSuggestion]) {
            insertSnippet(autocompleteSuggestions[selectedSuggestion]);
          }

          return;
        } else if (e.key === "Escape") {
          setShowAutocomplete(false);

          return;
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();

        const lines = value.split("\n");
        const textBeforeCursor = value.slice(0, selection.start);
        const currentLineIndex = textBeforeCursor.split("\n").length - 1;
        const currentLine = lines[currentLineIndex] || "";

        const indentMatch = currentLine.match(/^\s*/);
        const currentIndent = indentMatch ? indentMatch[0] : "";

        const shouldIncreaseIndent =
          /[{([][^}\])]*$/.test(currentLine.trim()) || currentLine.trim().endsWith(":");

        const newIndent = shouldIncreaseIndent ? currentIndent + "  " : currentIndent;

        const newText =
          value.slice(0, selection.start) + "\n" + newIndent + value.slice(selection.end);

        onChange(newText);

        setTimeout(() => {
          const newPosition = selection.start + 1 + newIndent.length;

          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newPosition, newPosition);
          }
        }, 0);
      } else if (e.key === "Tab") {
        e.preventDefault();
        const newText = value.slice(0, selection.start) + "  " + value.slice(selection.end);

        onChange(newText);
        setTimeout(() => {
          const newPosition = selection.start + 2;

          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newPosition, newPosition);
          }
        }, 0);
      }
    },
    [value, selection, showAutocomplete, autocompleteSuggestions, selectedSuggestion, readOnly]
  );

  // Функция для раскрашивания кода
  const renderHighlightedCode = useCallback(() => {
    if (!value) {
      return (
        <div className={styles.lineContainer}>
          <span className={styles.lineNumber}>1</span>
          <span className={styles.lineContent}>
            <span style={{ color: COLORS.comment }}>Введите код...</span>
            {document.activeElement === textareaRef.current &&
              cursorVisible &&
              cursorPosition.line === 0 &&
              cursorPosition.column === 0 && (
                <span className={styles.cursor} style={{ marginLeft: 0 }} />
              )}
          </span>
        </div>
      );
    }

    const lines = value.split("\n");

    return lines.map((line, lineIndex) => {
      const tokens: React.ReactNode[] = [];
      let i = 0;
      const length = line.length;

      while (i < length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === "/" && nextChar === "/") {
          tokens.push(
            <span key={`comment-${i}`} style={{ color: COLORS.comment }}>
              {line.slice(i)}
            </span>
          );
          break;
        }

        if (char === '"' || char === "'" || char === "`") {
          const quote = char;
          let j = i + 1;

          while (j < length && line[j] !== quote) {
            if (line[j] === "\\") j += 2;
            else j++;
          }

          const str = line.slice(i, j + 1);

          tokens.push(
            <span key={`string-${i}`} style={{ color: COLORS.string }}>
              {str}
            </span>
          );
          i = j + 1;
          continue;
        }

        if (/[0-9]/.test(char) && (i === 0 || !/[a-zA-Z_]/.test(line[i - 1]))) {
          let j = i;

          while (j < length && /[0-9.]/.test(line[j])) j++;

          const num = line.slice(i, j);

          tokens.push(
            <span key={`number-${i}`} style={{ color: COLORS.number }}>
              {num}
            </span>
          );
          i = j;
          continue;
        }

        if (/[a-zA-Z_]/.test(char)) {
          let j = i;

          while (j < length && /[a-zA-Z0-9_]/.test(line[j])) j++;

          const word = line.slice(i, j);

          const keywords = KEYWORDS[language] || [];
          let color = COLORS.text;

          if (keywords.includes(word)) {
            color = COLORS.keyword;
          } else if (["function", "def", "func"].includes(word)) {
            color = COLORS.function;
          } else if (["class", "interface", "struct", "enum"].includes(word)) {
            color = COLORS.type;
          }

          tokens.push(
            <span key={`word-${i}`} style={{ color }}>
              {word}
            </span>
          );
          i = j;
          continue;
        }

        if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
          tokens.push(
            <span key={`op-${i}`} style={{ color: COLORS.operator }}>
              {char}
            </span>
          );
          i++;
          continue;
        }

        if (/[{}()[\];,.]/.test(char)) {
          tokens.push(
            <span key={`punc-${i}`} style={{ color: COLORS.punctuation }}>
              {char}
            </span>
          );
          i++;
          continue;
        }

        tokens.push(
          <span key={`text-${i}`} style={{ color: COLORS.text }}>
            {char}
          </span>
        );
        i++;
      }

      // Если текущая строка - это строка с курсором, добавляем мигающий курсор
      const isCursorLine = lineIndex === cursorPosition.line;
      const showCursor =
        isCursorLine && document.activeElement === textareaRef.current && cursorVisible;

      return (
        <div key={`line-${lineIndex}`} className={styles.lineContainer}>
          <span className={styles.lineNumber}>{lineIndex + 1}</span>
          <span className={styles.lineContent}>
            {tokens}
            {showCursor && cursorPosition.column === line.length && (
              <span className={styles.cursor} style={{ marginLeft: 0 }} />
            )}
          </span>
        </div>
      );
    });
  }, [value, language, cursorPosition, cursorVisible]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className || ""}`}
      style={{ height }}
      data-code-editor
    >
      {onRun && (
        <button
          type="button"
          onClick={onRun}
          disabled={runLoading}
          className={styles.runButton}
          title="Запустить"
          aria-label="Запустить код"
        >
          <span className={styles.runIcon} />
        </button>
      )}

      <div className={styles.editorContainer}>
        <div className={styles.editorScroll}>
          <div className={styles.editor}>{renderHighlightedCode()}</div>
        </div>

        {/* Невидимое textarea для ввода */}
        <textarea
          ref={textareaRef}
          className={styles.hiddenTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelectionChange}
          onKeyDown={handleKeyDown}
          disabled={readOnly}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          wrap="off"
        />
      </div>

      {showAutocomplete && (
        <div className={styles.autocompleteContainer}>
          {autocompleteSuggestions.map((item, index) => (
            <button
              key={item}
              className={`${styles.suggestionItem} ${index === selectedSuggestion ? styles.suggestionItemSelected : ""}`}
              onClick={() => insertSnippet(item)}
              onMouseEnter={() => setSelectedSuggestion(index)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
