import Button from "../Button";

import { StableCodeEditor } from "./editorShared";
import styles from "./index.module.scss";
import { PreviewCodeTask } from "./PreviewCodeTask";
import type { SlideBlock, TheoryQuestionBlock } from "./types";

import type { CodeLanguage } from "@/app/http/codeService";

export function PreviewBlockStatic({ block }: { block: SlideBlock }) {
  if (block.type === "text") return <p>{block.content || "(пусто)"}</p>;

  if (block.type === "codeExample") {
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
  }

  if (block.type === "source") return null;

  if (block.type === "table") {
    return (
      <div className={styles.tableWrapper}>
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
      </div>
    );
  }

  if (block.type === "image") {
    return block.url ? (
      <img src={block.url} alt="" className={styles.previewImg} />
    ) : (
      <p>(изображение)</p>
    );
  }

  if (block.type === "codeTask") return <p>Задача: {block.description || "—"}</p>;

  if (block.type === "theoryQuestion") return <p>Вопрос: {block.text || "—"}</p>;

  return null;
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

export function PreviewBlock({
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
  onResults,
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
  onResults?: (results: unknown) => void;
}) {
  void slideId;

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

  if (block.type === "source") return null;

  if (block.type === "table") {
    return (
      <div className={styles.tableWrapper}>
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
      </div>
    );
  }

  if (block.type === "image") {
    return block.url ? <img src={block.url} alt="" className={styles.previewImg} /> : null;
  }

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
        onResults={onResults}
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
