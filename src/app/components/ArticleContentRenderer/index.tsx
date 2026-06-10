"use client";

import Image from "next/image";
import Link from "next/link";

import styles from "./index.module.scss";

import CodeEditor from "@/app/components/CodeEditor";
import type { CodeLanguage } from "@/app/http/codeService";
import type { ArticleBlock } from "@/app/http/types/community";

interface ArticleContentRendererProps {
  blocks: ArticleBlock[];
}

const ArticleContentRenderer = ({ blocks }: ArticleContentRendererProps) => {
  return (
    <div className={styles.content}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        const data = block.data || {};

        if (block.type === "text") {
          return (
            <p className={styles.textBlock} key={key}>
              {String(data.text || "")}
            </p>
          );
        }

        if (block.type === "image") {
          return (
            <div className={styles.mediaBlock} key={key}>
              {data.url ? (
                <Image
                  alt={String(data.caption || "Изображение статьи")}
                  className={styles.image}
                  height={480}
                  src={String(data.url)}
                  unoptimized
                  width={960}
                />
              ) : null}
              {data.caption ? <p className={styles.caption}>{String(data.caption)}</p> : null}
            </div>
          );
        }

        if (block.type === "link" && data.url) {
          return (
            <Link className={styles.linkCard} href={String(data.url)} key={key} rel="noreferrer" target="_blank">
              <span className={styles.linkLabel}>{String(data.label || "Открыть ссылку")}</span>
              <p className={styles.linkUrl}>{String(data.url)}</p>
            </Link>
          );
        }

        if (block.type === "table") {
          const rows = Array.isArray(data.rows) ? (data.rows as string[][]) : [];

          return (
            <div className={styles.tableWrap} key={key}>
              <div className={styles.tableCard}>
                {rows.map((row, rowIndex) => (
                  <div className={styles.tableRow} key={`${key}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <div
                        className={`${styles.tableCell} ${rowIndex === 0 ? styles.tableHeaderCell : ""}`}
                        key={`${key}-cell-${rowIndex}-${cellIndex}`}
                      >
                        <p
                          className={`${styles.tableCellText} ${rowIndex === 0 ? styles.tableHeaderText : ""}`}
                        >
                          {cell}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <div className={styles.codeBlock} key={key}>
              <p className={styles.codeLabel}>Демо-код · {String(data.language || "typescript")}</p>
              <CodeEditor
                height={260}
                language={(String(data.language || "typescript")) as CodeLanguage}
                onChange={() => undefined}
                readOnly
                value={String(data.code || "")}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ArticleContentRenderer;
