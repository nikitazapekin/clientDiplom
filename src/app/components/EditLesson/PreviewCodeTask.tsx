/* eslint-disable */

import { useCallback, useEffect, useRef, useState } from "react";

import Button from "../Button";

import styles from "./index.module.scss";
import { StableCodeEditor } from "./editorShared";
import {
  ConstraintResult,
  addJavaMainMethod,
  buildCSharpTestSuite,
  buildJavaTestSuite,
  buildTestCode,
  compareOutputs,
  extractFunctionName,
  formatArgsForDynamicLang,
  formatArgsForGolang,
  formatArgsForJavaOrCSharp,
  formatArgsForRust,
  generateObjectClasses,
  generateObjectClassesForPreview,
  getDefaultStarterCode,
  getDisplayInput,
  getExpectedOutputFromTestCase,
  getSampleArgsForLanguage,
  stripMainMethod,
} from "./codeUtils";
import type { CodeTaskBlock } from "./types";

import { CodeService } from "@/app/http/codeService";

export function PreviewCodeTask({
  block,
  testAnswer,
  setTestAnswer,
  testError,
  setTestError,
  onCorrect,
  onResults,
}: {
  block: CodeTaskBlock;
  testAnswer: string | number | undefined;
  setTestAnswer: (v: string | number) => void;
  testError: string | undefined;
  setTestError: (v: string) => void;
  onCorrect: () => void;
  onResults?: (results: any) => void;
}) {
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [constraintResults, setConstraintResults] = useState<ConstraintResult[] | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const localCodeRef = useRef<string>("");
  const activeReturnSchema =
    block.returnType === "object" || block.returnType === "list" ? block.returnSchema : undefined;
  const getExpectedOutputValue = useCallback(
    (testCase: NonNullable<CodeTaskBlock["testCases"]>[number]) =>
      getExpectedOutputFromTestCase(testCase, block.returnType, activeReturnSchema),
    [block.returnType, activeReturnSchema]
  );
  const hasConfiguredInput = useCallback(
    (testCase: NonNullable<CodeTaskBlock["testCases"]>[number]) => {
      if ((block.argumentScheme?.length ?? 0) > 0) {
        return (testCase.args?.length ?? 0) >= (block.argumentScheme?.length ?? 0);
      }

      return (testCase.input ?? "").trim() !== "";
    },
    [block.argumentScheme]
  );

  useEffect(() => {
    if (!localCodeRef.current && typeof testAnswer === "string" && testAnswer) {
      localCodeRef.current = testAnswer;
    }
  }, [testAnswer]);

  const getCurrentCode = useCallback(() => {
    if (localCodeRef.current) {
      return localCodeRef.current;
    }
    return typeof testAnswer === "string" && testAnswer !== ""
      ? testAnswer
      : (block.startCode ??
          getDefaultStarterCode(
            block.language ?? "javascript",
            block.argumentScheme ?? [],
            block.returnType ?? "int",
            activeReturnSchema
          ));
  }, [
    testAnswer,
    block.startCode,
    block.language,
    block.argumentScheme,
    block.returnType,
    activeReturnSchema,
  ]);

  const displayCode = stripMainMethod(getCurrentCode(), block.language ?? "javascript");

  const handleCodeChange = useCallback(
    (code: string) => {
      localCodeRef.current = code;
      setTestAnswer(code);
      setTestError("");
      setConsoleOutput(null);
      setTestResults(null);
      setConstraintResults(null);
      setExecutionTime(null);
    },
    [setTestAnswer, setTestError]
  );

  const runUserCode = async () => {
    setConsoleOutput(null);
    setIsRunning(true);
    try {
      const currentCode = getCurrentCode();
      const funcName = extractFunctionName(currentCode, block.language ?? "javascript");

      let codeToRun = currentCode;
      const objectClasses = generateObjectClasses(
        block.argumentScheme ?? [],
        block.language ?? "javascript",
        activeReturnSchema
      );
      const sampleArgs = getSampleArgsForLanguage(
        block.language ?? "javascript",
        block.argumentScheme ?? []
      );

      if (block.language === "java" && funcName) {
        codeToRun = addJavaMainMethod(currentCode, funcName, sampleArgs);
        if (objectClasses) {
          codeToRun = `${codeToRun}\n\n${objectClasses}`;
        }
      } else if (block.language === "golang" && funcName) {
        codeToRun = buildTestCode(currentCode, "", "golang", funcName, sampleArgs);
      } else if (block.language === "rust" && funcName) {
        codeToRun = buildTestCode(currentCode, "", "rust", funcName, sampleArgs);
      } else if (block.language === "typescript" && objectClasses) {
        codeToRun = `${objectClasses}\n\n${codeToRun}`;
      }

      const res = await CodeService.executeCode({
        language: block.language ?? "javascript",
        code: codeToRun,
      });

      let output = "";
      if (res.output) {
        const lines = res.output.split("\n");
        let inLogs = false;
        let inResult = false;
        let currentLogs: string[] = [];
        let currentResult: string[] = [];

        for (const line of lines) {
          if (line.includes("===LOGS_START===")) {
            inLogs = true;
            currentLogs = [];
            continue;
          }

          if (line.includes("===LOGS_END===")) {
            inLogs = false;
            if (currentLogs.length > 0) {
              output += " Логи выполнения:\n" + currentLogs.join("\n") + "\n\n";
            }
            continue;
          }

          if (line.includes("===RESULT_START===")) {
            inResult = true;
            currentResult = [];
            continue;
          }

          if (line.includes("===RESULT_END===")) {
            inResult = false;
            if (currentResult.length > 0) {
              output += " Результат функции:\n" + currentResult.join("\n");
            }
            continue;
          }

          if (inLogs) {
            currentLogs.push(line);
          } else if (inResult) {
            currentResult.push(line);
          } else if (!inLogs && !inResult && !line.includes("===")) {
            output += line + "\n";
          }
        }

        if (!output && res.output) {
          output = res.output;
        }
      }

      if (res.error) {
        output += `\n Ошибка: ${res.error}`;
      }

      setConsoleOutput(output || " Код выполнен успешно (нет вывода)");
    } catch (e) {
      setConsoleOutput(` Ошибка выполнения: ${e}`);
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
      code.includes("echo ") ||
      code.includes("puts(") ||
      code.includes("puts ") ||
      code.includes("println!") ||
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
            name: " Максимум строк кода",
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
            name: " Запрещённые слова",
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
            name: " Без комментариев",
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
            name: " Без отладочного вывода",
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
            name: " Цикломатическая сложность",
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
            name: "Использование памяти",
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
            name: " Обязательные ключевые слова",
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
            const objectClasses = generateObjectClasses(
              block.argumentScheme ?? [],
              block.language ?? "javascript",
              activeReturnSchema
            );
            const sampleArgs = getSampleArgsForLanguage(
              block.language ?? "javascript",
              block.argumentScheme ?? []
            );

            if (block.language === "java" && funcName) {
              codeToRun = addJavaMainMethod(code, funcName, sampleArgs);
              if (objectClasses) {
                codeToRun = `${codeToRun}\n\n${objectClasses}`;
              }
            } else if (block.language === "golang" && funcName) {
              codeToRun = buildTestCode(code, "", "golang", funcName, sampleArgs);
            } else if (block.language === "typescript" && objectClasses) {
              codeToRun = `${objectClasses}\n\n${codeToRun}`;
            } else if (block.language === "rust" && funcName) {
              codeToRun = buildTestCode(code, "", "rust", funcName, sampleArgs);
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
              name: " Время выполнения",
              passed: actualTime <= maxTime,
              expected: `≤ ${maxTime} мс`,
              actual: `${actualTime} мс`,
              value: maxTime,
            });
          } catch {
            results.push({
              type: "maxTimeMs",
              name: " Время выполнения",
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
    setConsoleOutput(null);

    const currentCode = getCurrentCode();

    if (block.runnable) {
      if (block.testCases?.length) {
        const funcName = extractFunctionName(currentCode, block.language ?? "javascript");

        if (!funcName) {
          setTestError(
            `Не удалось найти имя функции в коде для языка ${block.language}. Убедитесь, что функция определена правильно.`
          );
          return;
        }

        let results: { input: string; expected: string; actual: string; passed: boolean }[] = [];
        let allLogs: string[] = [];

        if (block.language === "java") {
          const formattedTestCases = (block.testCases ?? []).map((tc) => {
            const argsInput = formatArgsForJavaOrCSharp(
              tc.args,
              block.argumentScheme ?? [],
              "java"
            );
            return {
              input: argsInput || tc.input || "",
              expectedOutput: getExpectedOutputValue(tc),
            };
          });

          const codeWithTests = buildJavaTestSuite(currentCode, formattedTestCases, funcName);
          const objectClasses = generateObjectClasses(
            block.argumentScheme ?? [],
            "java",
            activeReturnSchema
          );
          const codeToRun = objectClasses ? `${codeWithTests}\n\n${objectClasses}` : codeWithTests;

          console.log("Java code to run:", codeToRun);

          const res = await CodeService.executeCode({
            language: "java",
            code: codeToRun,
          });

          if (res.error) {
            setTestError(`Ошибка выполнения: ${res.error}`);
            return;
          }

          const output = res.output || "";
          const lines = output.split("\n");

          console.log("Java output:", output);

          for (let i = 0; i < block.testCases.length; i++) {
            const testNum = i + 1;
            let inLogs = false;
            let inResult = false;
            let currentLogs: string[] = [];
            let currentResult: string[] = [];
            let testLogs: string[] = [];

            for (const line of lines) {
              if (line.includes(`===LOGS_START_${testNum}===`)) {
                inLogs = true;
                currentLogs = [];
                continue;
              }

              if (line.includes(`===LOGS_END_${testNum}===`)) {
                inLogs = false;
                if (currentLogs.length > 0) {
                  testLogs.push(
                    ` Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`
                  );
                  testLogs.push(currentLogs.join("\n"));
                  testLogs.push("");
                }
                continue;
              }

              if (line.includes(`===RESULT_START_${testNum}===`)) {
                inResult = true;
                currentResult = [];
                continue;
              }

              if (line.includes(`===RESULT_END_${testNum}===`)) {
                inResult = false;
                if (currentResult.length > 0) {
                  const actual = currentResult.join("\n").trim();
                  const expected = getExpectedOutputValue(block.testCases[i]).trim();

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
                    input: getDisplayInput(
                      block.testCases[i],
                      block.argumentScheme,
                      block.language
                    ),
                    expected,
                    actual,
                    passed,
                  });
                }
                continue;
              }

              if (inLogs) {
                currentLogs.push(line);
              } else if (inResult) {
                currentResult.push(line);
              }
            }

            if (testLogs.length > 0) {
              allLogs.push(...testLogs);
            }
          }
        } else if (block.language === "csharp") {
          const formattedTestCases = (block.testCases ?? []).map((tc) => {
            const argsInput = formatArgsForJavaOrCSharp(
              tc.args,
              block.argumentScheme ?? [],
              "csharp"
            );
            return {
              input: argsInput || tc.input || "",
              expectedOutput: getExpectedOutputValue(tc),
            };
          });

          const codeWithTests = buildCSharpTestSuite(currentCode, formattedTestCases, funcName);
          const objectClasses = generateObjectClasses(
            block.argumentScheme ?? [],
            "csharp",
            activeReturnSchema
          );
          const codeToRun = objectClasses ? `${codeWithTests}\n\n${objectClasses}` : codeWithTests;

          console.log("C# code to run:", codeToRun);

          const res = await CodeService.executeCode({
            language: "csharp",
            code: codeToRun,
          });

          if (res.error) {
            setTestError(`Ошибка выполнения: ${res.error}`);
            return;
          }

          const output = res.output || "";
          const lines = output.split("\n");

          console.log("C# output:", output);

          for (let i = 0; i < block.testCases.length; i++) {
            const testNum = i + 1;
            let inLogs = false;
            let inResult = false;
            let currentLogs: string[] = [];
            let currentResult: string[] = [];
            let testLogs: string[] = [];

            for (const line of lines) {
              if (line.includes(`===LOGS_START_${testNum}===`)) {
                inLogs = true;
                currentLogs = [];
                continue;
              }

              if (line.includes(`===LOGS_END_${testNum}===`)) {
                inLogs = false;
                if (currentLogs.length > 0) {
                  testLogs.push(
                    ` Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`
                  );
                  testLogs.push(currentLogs.join("\n"));
                  testLogs.push("");
                }
                continue;
              }

              if (line.includes(`===RESULT_START_${testNum}===`)) {
                inResult = true;
                currentResult = [];
                continue;
              }

              if (line.includes(`===RESULT_END_${testNum}===`)) {
                inResult = false;
                if (currentResult.length > 0) {
                  const actual = currentResult.join("\n").trim();
                  const expected = getExpectedOutputValue(block.testCases[i]).trim();

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
                    input: getDisplayInput(
                      block.testCases[i],
                      block.argumentScheme,
                      block.language
                    ),
                    expected,
                    actual,
                    passed,
                  });
                }
                continue;
              }

              if (inLogs) {
                currentLogs.push(line);
              } else if (inResult) {
                currentResult.push(line);
              }
            }

            if (testLogs.length > 0) {
              allLogs.push(...testLogs);
            }
          }
        } else if (block.language === "golang") {
          for (let i = 0; i < block.testCases.length; i++) {
            const tc = block.testCases[i];
            const argsInput = formatArgsForGolang(tc.args, block.argumentScheme ?? []);
            const inputToUse = (block.argumentScheme?.length ?? 0) > 0 ? argsInput : tc.input || "";
            const expectedOutput = getExpectedOutputValue(tc);

            if (!hasConfiguredInput(tc)) {
              setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
              return;
            }

            const codeToRun = buildTestCode(currentCode, "", "golang", funcName, inputToUse);
            const res = await CodeService.executeCode({
              language: "golang",
              code: codeToRun,
            });

            if (res.error) {
              setTestError(`Ошибка выполнения: ${res.error}`);
              return;
            }

            const output = res.output || "";
            const lines = output.split("\n");

            let inLogs = false;
            let inResult = false;
            let currentLogs: string[] = [];
            let currentResult: string[] = [];
            let testLogs: string[] = [];
            const testNum = i + 1;

            for (const line of lines) {
              if (line.includes("===LOGS_START===")) {
                inLogs = true;
                currentLogs = [];
                continue;
              }
              if (line.includes("===LOGS_END===")) {
                inLogs = false;
                if (currentLogs.length > 0) {
                  testLogs.push(
                    ` Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`
                  );
                  testLogs.push(currentLogs.join("\n"));
                  testLogs.push("");
                }
                continue;
              }
              if (line.includes("===RESULT_START===")) {
                inResult = true;
                currentResult = [];
                continue;
              }
              if (line.includes("===RESULT_END===")) {
                inResult = false;
                if (currentResult.length > 0) {
                  const actual = currentResult.join("\n").trim();
                  const expected = expectedOutput.trim();

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

                  results.push({
                    input: getDisplayInput(
                      block.testCases[i],
                      block.argumentScheme,
                      block.language
                    ),
                    expected,
                    actual,
                    passed: compareOutputs(actualParsed, expectedParsed),
                  });
                }
                continue;
              }

              if (inLogs) {
                currentLogs.push(line);
              } else if (inResult) {
                currentResult.push(line);
              }
            }

            if (testLogs.length > 0) {
              allLogs.push(...testLogs);
            }
          }
        } else if (
          block.language === "javascript" ||
          block.language === "typescript" ||
          block.language === "python" ||
          block.language === "php" ||
          block.language === "ruby"
        ) {
          const lang = block.language;

          for (let i = 0; i < block.testCases.length; i++) {
            const tc = block.testCases[i];
            const argsInput = formatArgsForDynamicLang(tc.args, block.argumentScheme ?? [], lang);
            const inputToUse = (block.argumentScheme?.length ?? 0) > 0 ? argsInput : tc.input || "";

            const expectedOutput = getExpectedOutputValue(tc);

            if (!hasConfiguredInput(tc)) {
              setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
              return;
            }

            const objectClasses = generateObjectClasses(
              block.argumentScheme ?? [],
              lang,
              activeReturnSchema
            );
            const codeWithClasses = objectClasses
              ? `${currentCode}\n\n${objectClasses}`
              : currentCode;

            const codeToRun = buildTestCode(codeWithClasses, "", lang, funcName, inputToUse);

            const res = await CodeService.executeCode({
              language: lang,
              code: codeToRun,
            });

            if (res.error) {
              setTestError(`Ошибка выполнения: ${res.error}`);
              return;
            }

            const output = res.output || "";
            const lines = output.split("\n");

            let inLogs = false;
            let inResult = false;
            let currentLogs: string[] = [];
            let currentResult: string[] = [];
            let testLogs: string[] = [];
            const testNum = i + 1;

            for (const line of lines) {
              if (line.includes("===LOGS_START===")) {
                inLogs = true;
                currentLogs = [];
                continue;
              }
              if (line.includes("===LOGS_END===")) {
                inLogs = false;
                if (currentLogs.length > 0) {
                  testLogs.push(
                    ` Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`
                  );
                  testLogs.push(currentLogs.join("\n"));
                  testLogs.push("");
                }
                continue;
              }
              if (line.includes("===RESULT_START===")) {
                inResult = true;
                currentResult = [];
                continue;
              }
              if (line.includes("===RESULT_END===")) {
                inResult = false;
                if (currentResult.length > 0) {
                  const actual = currentResult.join("\n").trim();
                  const expected = expectedOutput.trim();

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
                    input: getDisplayInput(
                      block.testCases[i],
                      block.argumentScheme,
                      block.language
                    ),
                    expected,
                    actual,
                    passed,
                  });
                }
                continue;
              }

              if (inLogs) {
                currentLogs.push(line);
              } else if (inResult) {
                currentResult.push(line);
              }
            }

            if (testLogs.length > 0) {
              allLogs.push(...testLogs);
            }
          }
        } else if (block.language === "rust") {
          for (let i = 0; i < block.testCases.length; i++) {
            const tc = block.testCases[i];
            const argsInput = formatArgsForRust(tc.args, block.argumentScheme ?? []);
            const inputToUse = (block.argumentScheme?.length ?? 0) > 0 ? argsInput : tc.input || "";
            const expectedOutput = getExpectedOutputValue(tc);

            if (!hasConfiguredInput(tc)) {
              setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
              return;
            }

            const codeToRun = buildTestCode(currentCode, "", "rust", funcName, inputToUse);
            const res = await CodeService.executeCode({
              language: "rust",
              code: codeToRun,
            });

            if (res.error) {
              setTestError(`Ошибка выполнения: ${res.error}`);
              return;
            }

            const output = res.output || "";
            const lines = output.split("\n");

            let inResult = false;
            let currentResult: string[] = [];

            for (const line of lines) {
              if (line.includes("===RESULT_START===")) {
                inResult = true;
                currentResult = [];
                continue;
              }
              if (line.includes("===RESULT_END===")) {
                inResult = false;
                if (currentResult.length > 0) {
                  const actual = currentResult.join("\n").trim();
                  const expected = expectedOutput.trim();

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

                  results.push({
                    input: getDisplayInput(
                      block.testCases[i],
                      block.argumentScheme,
                      block.language
                    ),
                    expected,
                    actual,
                    passed: compareOutputs(actualParsed, expectedParsed),
                  });
                }
                continue;
              }

              if (inResult) {
                currentResult.push(line);
              }
            }
          }
        } else {
          for (const tc of block.testCases) {
            const expectedOutput = getExpectedOutputValue(tc);

            if (!hasConfiguredInput(tc)) {
              setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
              return;
            }

            const codeToRun = buildTestCode(
              currentCode,
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

            const output = res.output || "";
            const lines = output.split("\n");

            let inLogs = false;
            let inResult = false;
            let currentLogs: string[] = [];
            let currentResult: string[] = [];

            for (const line of lines) {
              if (line.includes("===LOGS_START===")) {
                inLogs = true;
                currentLogs = [];
                continue;
              }
              if (line.includes("===LOGS_END===")) {
                inLogs = false;
                if (currentLogs.length > 0) {
                  allLogs.push(`Логи для входа "${tc.input}":`);
                  allLogs.push(currentLogs.join("\n"));
                  allLogs.push("");
                }
                continue;
              }
              if (line.includes("===RESULT_START===")) {
                inResult = true;
                currentResult = [];
                continue;
              }
              if (line.includes("===RESULT_END===")) {
                inResult = false;
                if (currentResult.length > 0) {
                  const resultStr = currentResult.join("\n").trim();

                  let actualParsed: any;
                  let expectedParsed: any;

                  try {
                    actualParsed = JSON.parse(resultStr);
                  } catch {
                    actualParsed = resultStr;
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
                    actual: resultStr,
                    passed,
                  });
                }
                continue;
              }

              if (inLogs) {
                currentLogs.push(line);
              } else if (inResult) {
                currentResult.push(line);
              }
            }
          }
        }

        if (allLogs.length > 0) {
          setConsoleOutput(allLogs.join("\n"));
        }

        setTestResults(results);

        let constraintCheckResults: ConstraintResult[] = [];
        if (block.constraints?.length) {
          constraintCheckResults = await checkConstraints(currentCode, block.constraints);
          setConstraintResults(constraintCheckResults);
        }

        const allTestsPassed = results.every((r) => r.passed);
        const allConstraintsPassed = constraintCheckResults.every((c) => c.passed);

        if (onResults) {
          onResults({
            testResults: results,
            constraintResults: constraintCheckResults,
            passedTests: results.filter((r) => r.passed).length,
            totalTests: results.length,
            allPassed: allTestsPassed && allConstraintsPassed,
            constraintsPassed: allConstraintsPassed,
          });
        }

        if (allTestsPassed && allConstraintsPassed) {
          onCorrect();
          setTestError("");
        } else {
          const failedTests = results
            .filter((r) => !r.passed)
            .map(
              (r) =>
                ` Тест ${results.findIndex((tr) => tr === r) + 1}: вход=${r.input}, ожидалось=${r.expected}, получено=${r.actual}`
            );

          const failedConstraints = constraintCheckResults
            .filter((c) => !c.passed)
            .map((c) => ` ${c.name}: ожидалось ${c.expected}, получено ${c.actual}`);

          const errorMessages = [];

          if (failedTests.length > 0) {
            errorMessages.push(` Провалено тестов: ${failedTests.length} из ${results.length}`);
            errorMessages.push(...failedTests);
          }

          if (failedConstraints.length > 0) {
            errorMessages.push(`\n Не пройдены ограничения:`);
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
        code: currentCode,
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

      {(block.language === "java" ||
        block.language === "csharp" ||
        block.language === "typescript") &&
        generateObjectClassesForPreview(
          block.argumentScheme ?? [],
          block.language,
          activeReturnSchema
        ) && (
          <div className={styles.objectDescriptions}>
            <h4>Описание классов:</h4>
            <pre className={styles.objectClassCode}>
              {generateObjectClassesForPreview(
                block.argumentScheme ?? [],
                block.language,
                activeReturnSchema
              )}
            </pre>
          </div>
        )}

      <StableCodeEditor
        value={displayCode}
        onChange={handleCodeChange}
        language={block.language ?? "javascript"}
        height={250}
      />

      <div className={styles.runButtons}>
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

      {testResults && (
        <div className={styles.testResults}>
          <div className={styles.resultsHeader}>
            <h4> Результаты тестирования</h4>
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
                    {result.passed ? "Пройден" : "Провален"}
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
            <h4> Проверка ограничений</h4>
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
                  <span className={styles.constraintStatus}>
                    {constraint.passed ? "Пройден" : "Провален"}
                  </span>
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

      {testError && (
        <div className={styles.testError}>
          <pre>{testError}</pre>
        </div>
      )}
    </div>
  );
}
