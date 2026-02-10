"use client";

import { useState } from "react";

import { type CodeLanguage, CodeService } from "@/app/http/codeService";

const defaultSnippets: Record<CodeLanguage, string> = {
  javascript: `// JavaScript
let a = 11;
let b = 444;
console.log(a + b);`,
  python: `# Python
a = 11
b = 444
print(a + b)`,
  csharp: `// C#
Console.WriteLine(11 + 444);`,
  golang: `// Go
fmt.Println(11 + 444)`,
};

const languages: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "csharp", label: "C#" },
  { value: "golang", label: "Go" },
];

const Page = () => {
  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [code, setCode] = useState<string>(defaultSnippets.javascript);
  const [output, setOutput] = useState<string>("Нажмите «Запустить код»");
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageChange = (value: CodeLanguage) => {
    setLanguage(value);
    setCode(defaultSnippets[value]);
  };

  const handleRun = async () => {
    if (!code.trim()) {
      setOutput("Введите код для выполнения");

      return;
    }

    setIsLoading(true);
    setOutput("Отправка запроса на сервер...");

    try {
      const result = await CodeService.executeCode({ language, code });

      setOutput(result.output || "Код выполнен, но вывода нет");
    } catch (e: any) {
      setOutput(`Ошибка при выполнении: ${e?.message || "Неизвестная ошибка"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setOutput("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#e5e7eb",
        display: "flex",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          backgroundColor: "#020617",
          borderRadius: "0.75rem",
          border: "1px solid #1e293b",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.8)",
          padding: "1.5rem",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              Интерпретатор кода
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              Введите код, выберите язык и запустите выполнение на сервере.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <label htmlFor="language" style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              Язык
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
              style={{
                backgroundColor: "#020617",
                color: "#e5e7eb",
                borderRadius: "0.5rem",
                border: "1px solid #374151",
                padding: "0.4rem 0.75rem",
                fontSize: "0.875rem",
                outline: "none",
              }}
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Редактор кода</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isLoading}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: isLoading ? "default" : "pointer",
                    background: "linear-gradient(to right, #22c55e, #16a34a)",
                    color: "#0b1120",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "Выполняется..." : "Запустить код"}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #374151",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    backgroundColor: "#020617",
                    color: "#e5e7eb",
                  }}
                >
                  Очистить вывод
                </button>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: "320px",
                resize: "vertical",
                backgroundColor: "#020617",
                color: "#e5e7eb",
                borderRadius: "0.5rem",
                border: "1px solid #1f2937",
                padding: "0.75rem",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                outline: "none",
                boxShadow: "inset 0 0 0 1px #020617",
              }}
            />
          </section>

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Результат выполнения</span>
            </div>
            <pre
              style={{
                width: "100%",
                minHeight: "320px",
                backgroundColor: "#020617",
                color: "#e5e7eb",
                borderRadius: "0.5rem",
                border: "1px solid #1f2937",
                padding: "0.75rem",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {output}
            </pre>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Page;
