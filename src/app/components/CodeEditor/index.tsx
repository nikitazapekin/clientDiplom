"use client";

import dynamic from "next/dynamic";

import styles from "./index.module.scss";

import type { CodeLanguage } from "@/app/http/codeService";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div style={{ minHeight: 200, background: "#f0f0f0", borderRadius: 4 }} />,
});

const MONACO_LANG: Record<CodeLanguage, string> = {
  javascript: "javascript",
  python: "python",
  csharp: "csharp",
  java: "java",
  golang: "go",
};

export interface CodeEditorProps {
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
  const monacoLang = MONACO_LANG[language] ?? "plaintext";

  return (
    <div className={className} style={{ position: "relative" }} data-code-editor>
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
      <MonacoEditor
        height={height}
        width={600}
        language={monacoLang}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          suggest: { showKeywords: true, showSnippets: true },
          quickSuggestions: true,
          tabSize: 2,
          padding: { top: 8 },
        }}
        theme="vs-dark"
      />
    </div>
  );
}
