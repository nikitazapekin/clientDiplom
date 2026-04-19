import { useRef } from "react";

import CodeEditor from "../CodeEditor";

import styles from "./index.module.scss";
import type { SlideBlock } from "./types";

import type { CodeLanguage } from "@/app/http/codeService";

export const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "golang", label: "Go" },
  { value: "cpp", label: "C++" },
];

export function sortBlocks(blocks: SlideBlock[]): SlideBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

export function StableCodeEditor({
  value,
  onChange,
  language,
  height,
  readOnly,
  onRun,
  runLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  height: number;
  readOnly?: boolean;
  onRun?: () => void;
  runLoading?: boolean;
}) {
  const editorId = useRef(`editor_${Date.now()}_${Math.random().toString(36)}`).current;

  return (
    <div className={styles.codeEditorWrapper} data-editor-id={editorId}>
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
