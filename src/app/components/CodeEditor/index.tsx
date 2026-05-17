
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
  typescript: [
    "function",
    "const",
    "let",
    "type",
    "interface",
    "enum",
    "implements",
    "extends",
    "readonly",
    "keyof",
    "typeof",
    "infer",
    "as",
    "unknown",
    "never",
    "void",
    "number",
    "string",
    "boolean",
    "Array",
    "Record",
    "Promise",
    "async",
    "await",
    "return",
    "class",
    "import",
    "export",
    "from",
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
  php: [
    "function",
    "echo",
    "print",
    "if",
    "elseif",
    "else",
    "for",
    "foreach",
    "while",
    "return",
    "class",
    "public",
    "private",
    "protected",
    "static",
    "new",
    "array",
    "json_encode",
    "json_decode",
    "require",
    "include",
    "namespace",
    "use",
    "try",
    "catch",
    "finally",
  ],
  ruby: [
    "def",
    "end",
    "if",
    "elsif",
    "else",
    "unless",
    "while",
    "until",
    "for",
    "each",
    "do",
    "return",
    "puts",
    "print",
    "class",
    "module",
    "attr_accessor",
    "require",
    "begin",
    "rescue",
    "ensure",
    "yield",
    "self",
    "nil",
    "true",
    "false",
  ],
  rust: [
    "fn",
    "let",
    "mut",
    "if",
    "else",
    "match",
    "loop",
    "while",
    "for",
    "in",
    "return",
    "struct",
    "enum",
    "impl",
    "trait",
    "pub",
    "use",
    "mod",
    "vec!",
    "String",
    "println!",
    "format!",
    "Option",
    "Result",
    "Some",
    "None",
    "Ok",
    "Err",
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

const FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const CURSOR_HEIGHT = 18;
const PADDING_VERTICAL = 8;
const PADDING_HORIZONTAL = 8;
const LINE_NUMBER_WIDTH = 40;
const CURSOR_SAMPLE = "MMMMMMMMMM";

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
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const selectionRef = useRef(selection);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [characterWidth, setCharacterWidth] = useState(FONT_SIZE * 0.6);
  const [lineLayouts, setLineLayouts] = useState<Record<number, { top: number; height: number }>>(
    {}
  );

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const setTrackedSelection = useCallback((nextSelection: { start: number; end: number }) => {
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  }, []);

  const syncSelectionToTextarea = useCallback(
    (nextSelection: { start: number; end: number }) => {
      setTrackedSelection(nextSelection);

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;

        if (!textarea) {
          return;
        }

        textarea.focus();
        textarea.setSelectionRange(nextSelection.start, nextSelection.end);
      });
    },
    [setTrackedSelection]
  );

  const getCurrentWord = useCallback((text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos);
    const afterCursor = text.slice(pos);

    const beforeMatch = beforeCursor.match(/[a-zA-Z0-9_.]*$/);
    const afterMatch = afterCursor.match(/^[a-zA-Z0-9_]*/);

    return (beforeMatch ? beforeMatch[0] : "") + (afterMatch ? afterMatch[0] : "");
  }, []);

  const getCursorLocation = useCallback((text: string, offset: number) => {
    const textBeforeCursor = text.slice(0, offset);
    const lines = textBeforeCursor.split("\n");

    return {
      line: lines.length - 1,
      column: lines[lines.length - 1]?.length ?? 0,
    };
  }, []);

  useEffect(() => {
    const word = getCurrentWord(value, selection.start);

    if (word.length >= 2 && !readOnly && isFocused) {
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
  }, [value, selection.start, language, readOnly, isFocused, getCurrentWord]);

  const insertSnippet = useCallback(
    (snippet: string) => {
      const currentSelection = selectionRef.current;
      const beforeCursor = value.slice(0, currentSelection.start);
      const afterCursor = value.slice(currentSelection.end);
      const word = getCurrentWord(value, currentSelection.start);

      const newText = beforeCursor.slice(0, -word.length) + snippet + afterCursor;

      onChange(newText);

      const newPosition = beforeCursor.length - word.length + snippet.length;

      syncSelectionToTextarea({ start: newPosition, end: newPosition });
      setShowAutocomplete(false);
    },
    [value, onChange, getCurrentWord, syncSelectionToTextarea]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = e.target.value;
      const currentSelection = selectionRef.current;
      const beforeCursor = value.slice(0, currentSelection.start);
      const afterCursor = value.slice(currentSelection.end);
      const canResolveInsertedText =
        nextValue.startsWith(beforeCursor) &&
        nextValue.endsWith(afterCursor) &&
        nextValue.length >= beforeCursor.length + afterCursor.length;

      if (!canResolveInsertedText) {
        onChange(nextValue);

        return;
      }

      const insertedText = nextValue.slice(
        beforeCursor.length,
        nextValue.length - afterCursor.length
      );

      if (insertedText !== "\n") {
        onChange(nextValue);

        return;
      }

      const currentLine = beforeCursor.slice(beforeCursor.lastIndexOf("\n") + 1);
      const currentIndent = currentLine.match(/^\s*/)?.[0] ?? "";
      const trimmedLine = currentLine.trimEnd();
      const shouldIncreaseIndent =
        /[[{(]\s*$/.test(trimmedLine) || trimmedLine.endsWith(":");
      const newIndent = shouldIncreaseIndent ? `${currentIndent}  ` : currentIndent;
      const nextText = `${beforeCursor}\n${newIndent}${afterCursor}`;
      const nextCursorPosition = beforeCursor.length + 1 + newIndent.length;

      onChange(nextText);
      syncSelectionToTextarea({ start: nextCursorPosition, end: nextCursorPosition });
    },
    [value, onChange, syncSelectionToTextarea]
  );

  const handleSelectionChange = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = e.currentTarget;
      const nextSelection = {
        start: target.selectionStart,
        end: target.selectionEnd,
      };

      setCursorVisible(true);
      setTrackedSelection(nextSelection);
    },
    [setTrackedSelection]
  );

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

      if (e.key === "Tab") {
        e.preventDefault();
        const currentSelection = selectionRef.current;
        const newText =
          value.slice(0, currentSelection.start) + "  " + value.slice(currentSelection.end);

        onChange(newText);
        syncSelectionToTextarea({
          start: currentSelection.start + 2,
          end: currentSelection.start + 2,
        });
      }
    },
    [
      value,
      showAutocomplete,
      autocompleteSuggestions,
      selectedSuggestion,
      readOnly,
      onChange,
      insertSnippet,
      syncSelectionToTextarea,
    ]
  );

  const handleFocus = useCallback(() => {
    setCursorVisible(true);
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const scrollContainer = editorScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTop = target.scrollTop;
    scrollContainer.scrollLeft = target.scrollLeft;
  }, []);

  const measureCharacterWidth = useCallback(() => {
    const width = measureRef.current?.getBoundingClientRect().width;

    if (!width) {
      return;
    }

    setCharacterWidth(width / CURSOR_SAMPLE.length);
  }, []);

  const measureLineLayouts = useCallback(() => {
    setLineLayouts((prev) => {
      const next: Record<number, { top: number; height: number }> = {};

      for (const [lineIndex, node] of lineRefs.current.entries()) {
        if (!node) {
          continue;
        }

        next[lineIndex] = {
          top: node.offsetTop,
          height: node.offsetHeight,
        };
      }

      const prevEntries = Object.entries(prev);
      const nextEntries = Object.entries(next);
      const hasSameLayouts =
        prevEntries.length === nextEntries.length &&
        nextEntries.every(([index, layout]) => {
          const prevLayout = prev[Number(index)];

          return prevLayout?.top === layout.top && prevLayout?.height === layout.height;
        });

      return hasSameLayouts ? prev : next;
    });
  }, []);

  const registerLineRef = useCallback((lineIndex: number, node: HTMLDivElement | null) => {
    if (node) {
      lineRefs.current.set(lineIndex, node);

      return;
    }

    lineRefs.current.delete(lineIndex);
  }, []);

  useEffect(() => {
    measureCharacterWidth();

    const frameId = requestAnimationFrame(() => {
      measureLineLayouts();
    });

    return () => cancelAnimationFrame(frameId);
  }, [value, measureCharacterWidth, measureLineLayouts]);

  useEffect(() => {
    const handleResize = () => {
      measureCharacterWidth();
      measureLineLayouts();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [measureCharacterWidth, measureLineLayouts]);

  const cursorLocation = getCursorLocation(value, selection.start);
  const activeLineLayout = lineLayouts[cursorLocation.line];
  const shouldRenderCursor =
    isFocused &&
    !readOnly &&
    cursorVisible &&
    selection.start === selection.end;
  const cursorStyle = {
    left: PADDING_HORIZONTAL + LINE_NUMBER_WIDTH + cursorLocation.column * characterWidth,
    top:
      (activeLineLayout?.top ?? PADDING_VERTICAL + cursorLocation.line * LINE_HEIGHT) +
      ((activeLineLayout?.height ?? LINE_HEIGHT) - CURSOR_HEIGHT) / 2,
  };

  const renderHighlightedCode = useCallback(() => {
    if (!value) {
      return (
        <div
          ref={(node) => registerLineRef(0, node)}
          className={styles.lineContainer}
        >
          <span className={styles.lineNumber}>1</span>
          <span className={styles.lineContent}>
            <span style={{ color: COLORS.comment }}>Введите код...</span>
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

      return (
        <div
          key={`line-${lineIndex}`}
          ref={(node) => registerLineRef(lineIndex, node)}
          className={styles.lineContainer}
        >
          <span className={styles.lineNumber}>{lineIndex + 1}</span>
          <span className={styles.lineContent}>{tokens}</span>
        </div>
      );
    });
  }, [value, language, registerLineRef]);

  return (
    <div
      className={`${styles.container} ${className || ""} ${isFocused ? styles.focused : ""}`}
      style={{ height, width: "100%" }}
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
          {runLoading ? (
            <span className={styles.runLoading} />
          ) : (
            <span className={styles.runIcon} />
          )}
        </button>
      )}

      <div className={styles.editorContainer}>
        <div ref={editorScrollRef} className={styles.editorScroll}>
          <div className={styles.editor}>
            {renderHighlightedCode()}
            {shouldRenderCursor && <span className={styles.cursor} style={cursorStyle} />}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className={styles.hiddenTextarea}
          value={value}
          onChange={handleChange}
          onSelect={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onScroll={handleScroll}
          disabled={readOnly}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          wrap="off"
        />

        <span ref={measureRef} className={styles.measureText} aria-hidden="true">
          {CURSOR_SAMPLE}
        </span>
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
