"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/app/components/Button";
import CodeEditor from "@/app/components/CodeEditor";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import {
  CodingTasksService,
  type CodeTask,
  type SubmitSolutionResult,
  type StudentLevel,
  type CodeConstraint,
} from "@/app/http/codingTasksService";

import styles from "./page.module.scss";

const DIFF_COLORS: Record<string, string> = {
  easy: "#4caf50",
  medium: "#ff9800",
  hard: "#f44336",
};

const DIFF_LABELS: Record<string, string> = {
  easy: "Легкий",
  medium: "Средний",
  hard: "Сложный",
};

const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  csharp: "C#",
  java: "Java",
  golang: "Go",
  cpp: "C++",
};

// Типы ограничений
type CodeConstraintType =
  | "maxTimeMs"
  | "maxLines"
  | "forbiddenTokens"
  | "noComments"
  | "noConsoleLog"
  | "maxComplexity"
  | "memoryLimit"
  | "requiredKeywords";

// Интерфейс для результата проверки ограничений
interface ConstraintCheckResult {
  passed: boolean;
  errors: string[];
}

// Вспомогательные функции для обработки кода Java и C#
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

const parseArguments = (input: string): any[] => {
  if (!input.trim()) return [];

  try {
    if (input.trim().startsWith("[") && input.trim().endsWith("]")) {
      return JSON.parse(input);
    }
  } catch {
    // Не JSON, продолжаем
  }

  const args: any[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  let braceCount = 0;
  let bracketCount = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'" || char === "`") && input[i - 1] !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar) {
        inString = false;
        current += char;
      } else {
        current += char;
      }
    } else if (char === "{" && !inString) {
      braceCount++;
      current += char;
    } else if (char === "}" && !inString) {
      braceCount--;
      current += char;
    } else if (char === "[" && !inString) {
      bracketCount++;
      current += char;
    } else if (char === "]" && !inString) {
      bracketCount--;
      current += char;
    } else if (char === "," && !inString && braceCount === 0 && bracketCount === 0) {
      const trimmed = current.trim();
      if (trimmed) {
        args.push(parseValue(trimmed));
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(parseValue(current.trim()));
  }

  return args;
};

const parseValue = (value: string): any => {
  if (value === "") return "";

  try {
    return JSON.parse(value);
  } catch {
    // Не JSON
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value === "undefined") return undefined;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

const formatArgumentsForCode = (args: any[]): string => {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return `"${arg}"`;
      }
      if (typeof arg === "object") {
        return JSON.stringify(arg);
      }
      return String(arg);
    })
    .join(", ");
};

// Улучшенная функция для Java с поддержкой нескольких тест-кейсов и логов
const buildJavaTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string }[],
  funcName: string | null
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      const args = parseArguments(tc.input);
      const argsStr = formatArgumentsForCode(args);

      return `
        // Тест ${index + 1}
        {
            // Перехватываем System.out для этого теста
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            java.io.PrintStream originalOut = System.out;
            System.setOut(new java.io.PrintStream(baos));

            try {
                Object result = ${funcName}(${argsStr});

                // Восстанавливаем System.out
                System.setOut(originalOut);

                // Получаем логи для этого теста
                String logs = baos.toString();

                // Выводим логи, если они есть
                if (!logs.isEmpty()) {
                    System.out.println("===LOGS_START_" + ${index + 1} + "===");
                    System.out.print(logs);
                    System.out.println("===LOGS_END_" + ${index + 1} + "===");
                }

                // Выводим результат
                System.out.println("===RESULT_START_" + ${index + 1} + "===");
                if (result == null) {
                    System.out.print("null");
                } else if (result instanceof String) {
                    System.out.print("\\"" + result + "\\"");
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
                System.out.println("===RESULT_END_" + ${index + 1} + "===");

            } catch (Exception e) {
                System.setOut(originalOut);
                System.out.println("===RESULT_START_" + ${index + 1} + "===");
                System.out.print("{\\"error\\":\\"" + e.getMessage() + "\\"}");
                System.out.println("===RESULT_END_" + ${index + 1} + "===");
            }
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

// Функция для построения C# тестов
const buildCSharpTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string }[],
  funcName: string | null
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      const testNum = index + 1;
      const args = parseArguments(tc.input);
      const argsStr = formatArgumentsForCode(args);

      return `
        // Тест ${testNum}
        {
            var originalOut = Console.Out;
            var originalError = Console.Error;
            var outWriter = new StringWriter();
            var errorWriter = new StringWriter();
            Console.SetOut(outWriter);
            Console.SetError(errorWriter);

            try {
                var result = Program.${funcName}(${argsStr});

                Console.SetOut(originalOut);
                Console.SetError(originalError);

                var outLogs = outWriter.ToString();
                var errorLogs = errorWriter.ToString();

                // Выводим логи если есть
                if (!string.IsNullOrEmpty(outLogs) || !string.IsNullOrEmpty(errorLogs)) {
                    Console.WriteLine("===LOGS_START_" + ${testNum} + "===");
                    if (!string.IsNullOrEmpty(outLogs)) {
                        Console.Write(outLogs);
                    }
                    if (!string.IsNullOrEmpty(errorLogs)) {
                        Console.Write("ERROR: " + errorLogs);
                    }
                    if (!outLogs.EndsWith("\\n") && !errorLogs.EndsWith("\\n")) {
                        Console.WriteLine();
                    }
                    Console.WriteLine("===LOGS_END_" + ${testNum} + "===");
                }

                // Выводим результат
                Console.WriteLine("===RESULT_START_" + ${testNum} + "===");
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
                Console.WriteLine("===RESULT_END_" + ${testNum} + "===");

            } catch (Exception e) {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Console.WriteLine("===RESULT_START_" + ${testNum} + "===");
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { error = e.Message }));
                Console.WriteLine("===RESULT_END_" + ${testNum} + "===");
            }
        }`;
    })
    .join("\n");

  // Добавляем необходимые using директории
  const usings = `using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
`;

  // Проверяем, есть ли уже using директивы
  if (userCode.includes("using System;")) {
    // Заменяем существующие using или добавляем в начало
    return (
      usings +
      "\n" +
      userCode.replace(/^using.*;(\r\n|\r|\n)?/g, "") +
      `

public class Program {
    public static void Main() {
${testCasesCode}
    }
}`
    );
  } else {
    // Добавляем using и класс Program
    return (
      usings +
      "\n" +
      userCode +
      `

public class Program {
    public static void Main() {
${testCasesCode}
    }
}`
    );
  }
};

// Функция для парсинга вывода тестов
const parseTestOutput = (output: string, testNum: number): { logs: string[], result: string } => {
  if (!output) return { logs: [], result: '' };

  const lines = output.split('\n');
  let inLogs = false;
  let inResult = false;
  const logs: string[] = [];
  let result = '';

  for (const line of lines) {
    if (line.includes(`===LOGS_START_${testNum}===`) || line.includes(`===LOGS_START===`)) {
      inLogs = true;
      continue;
    }
    if (line.includes(`===LOGS_END_${testNum}===`) || line.includes(`===LOGS_END===`)) {
      inLogs = false;
      continue;
    }
    if (line.includes(`===RESULT_START_${testNum}===`) || line.includes(`===RESULT_START===`)) {
      inResult = true;
      continue;
    }
    if (line.includes(`===RESULT_END_${testNum}===`) || line.includes(`===RESULT_END===`)) {
      inResult = false;
      continue;
    }

    if (inLogs) {
      logs.push(line);
    }
    if (inResult) {
      result += line + '\n';
    }
  }

  return { logs, result: result.trim() };
};

// Функция для сравнения выводов
const compareOutputs = (actual: string, expected: string): boolean => {
  // Удаляем лишние пробелы и сравниваем
  const normalizedActual = actual.replace(/\s+/g, '').trim();
  const normalizedExpected = expected.replace(/\s+/g, '').trim();
  
  if (normalizedActual === normalizedExpected) return true;
  
  try {
    // Пробуем распарсить как JSON для сравнения объектов
    const actualObj = JSON.parse(actual);
    const expectedObj = JSON.parse(expected);
    return JSON.stringify(actualObj) === JSON.stringify(expectedObj);
  } catch {
    // Если не JSON, сравниваем как строки
    return actual.trim() === expected.trim();
  }
};

// Функция для проверки ограничений
const checkConstraints = (code: string, language: CodeLanguage, constraints: CodeConstraint[]): ConstraintCheckResult => {
  const errors: string[] = [];

  for (const constraint of constraints) {
    const type = constraint.type as CodeConstraintType;

    switch (type) {
      case "maxLines":
        const lineCount = code.split('\n').length;
        if (lineCount > constraint.value) {
          errors.push(`Превышено максимальное количество строк: ${lineCount} > ${constraint.value}`);
        }
        break;

      case "forbiddenTokens":
        const forbiddenTokens = constraint.value as string[];
        for (const token of forbiddenTokens) {
          // Проверяем наличие запрещенного токена как отдельного слова
          const tokenRegex = new RegExp(`\\b${token}\\b`, 'g');
          if (tokenRegex.test(code)) {
            errors.push(`Использование запрещенного токена: "${token}"`);
          }
        }
        break;

      case "noComments":
        if (constraint.value === true) {
          // Проверяем наличие комментариев в зависимости от языка
          let hasComments = false;
          
          if (language === "javascript" || language === "java" || language === "csharp" || language === "cpp" || language === "golang") {
            // Однострочные комментарии // и многострочные /* */
            hasComments = /\/\/.*|\/\*[\s\S]*?\*\//.test(code);
          } else if (language === "python") {
            // Однострочные комментарии #
            hasComments = /#.*/.test(code);
          }
          
          if (hasComments) {
            errors.push("Использование комментариев запрещено");
          }
        }
        break;

      case "noConsoleLog":
        if (constraint.value === true) {
          // Проверяем наличие console.log в зависимости от языка
          if (language === "javascript" && /\bconsole\.log\s*\(/.test(code)) {
            errors.push("Использование console.log запрещено");
          } else if (language === "python" && /\bprint\s*\(/.test(code)) {
            errors.push("Использование print запрещено");
          } else if ((language === "java" || language === "csharp" || language === "cpp") && /\bSystem\.out\.print|Console\.Write(Line)?|cout\s*<</.test(code)) {
            errors.push("Использование вывода в консоль запрещено");
          }
        }
        break;

      case "maxComplexity":
        // Простая оценка сложности по количеству вложенных циклов/условий
        const complexity = estimateCodeComplexity(code, language);
        if (complexity > constraint.value) {
          errors.push(`Превышена максимальная сложность кода: ${complexity} > ${constraint.value}`);
        }
        break;

      case "memoryLimit":
        // Эта проверка должна выполняться на сервере
        // Здесь просто добавляем предупреждение
        break;

      case "maxTimeMs":
        // Эта проверка должна выполняться на сервере
        // Здесь просто добавляем предупреждение
        break;

      case "requiredKeywords":
        const requiredKeywords = constraint.value as string[];
        for (const keyword of requiredKeywords) {
          // Проверяем наличие обязательного ключевого слова
          const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'g');
          if (!keywordRegex.test(code)) {
            errors.push(`Отсутствует обязательное ключевое слово: "${keyword}"`);
          }
        }
        break;
    }
  }

  return {
    passed: errors.length === 0,
    errors
  };
};

// Функция для оценки сложности кода
const estimateCodeComplexity = (code: string, language: CodeLanguage): number => {
  let complexity = 1; // Базовая сложность

  // Подсчет циклов
  const loopPatterns = [
    /\bfor\s*\(/g,  // for loop
    /\bwhile\s*\(/g,  // while loop
    /\bdo\s*\{/g,  // do-while
    /\bforeach\s*\(/g,  // foreach
    /\bfor\s+\w+\s+in\b/g,  // Python for
  ];

  for (const pattern of loopPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  // Подсчет условных операторов
  const conditionPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
  ];

  for (const pattern of conditionPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length * 0.5;
    }
  }

  return Math.floor(complexity);
};

// Компонент модального окна
const SuccessModal = ({ 
  isOpen, 
  onClose, 
  experienceGained, 
  newLevel 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  experienceGained: number; 
  newLevel: number; 
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>✅</div>
        <h2 className={styles.modalTitle}>Задача решена!</h2>
        <div className={styles.modalBody}>
          <p>Поздравляем! Вы успешно решили задачу.</p>
          <p className={styles.modalSubtext}>Все тесты пройдены и все ограничения соблюдены.</p>
          <div className={styles.modalRewards}>
            <div className={styles.modalReward}>
              <span>Получено опыта:</span>
              <strong>+{experienceGained} XP</strong>
            </div>
            <div className={styles.modalReward}>
              <span>Текущий уровень:</span>
              <strong>{newLevel}</strong>
            </div>
          </div>
        </div>
        <button className={styles.modalButton} onClick={onClose}>
          Отлично!
        </button>
      </div>
    </div>
  );
};

// Компонент для отображения ошибок ограничений
const ConstraintErrors = ({ errors }: { errors: string[] }) => {
  if (errors.length === 0) return null;

  return (
    <div className={styles.constraintErrors}>
      <div className={styles.constraintErrorsHeader}>
        <span>⚠️ Нарушены ограничения:</span>
      </div>
      <ul className={styles.constraintErrorsList}>
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

export default function SolveProblemPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<CodeTask | null>(null);
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>("javascript");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [result, setResult] = useState<SubmitSolutionResult | null>(null);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);
  const [rawOutput, setRawOutput] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [constraintErrors, setConstraintErrors] = useState<string[]>([]);
  const [constraintsPassed, setConstraintsPassed] = useState<boolean | null>(null);

  const loadTask = useCallback(async () => {
    try {
      const [data, level] = await Promise.all([
        CodingTasksService.getTask(taskId),
        CodingTasksService.getStudentLevel().catch(() => null),
      ]);
      setTask(data);
      const firstLang = (data.languages?.[0] || "javascript") as CodeLanguage;
      setSelectedLang(firstLang);
      setCode(data.startCodes?.[firstLang] || "");
      setStudentLevel(level);
    } catch (e) {
      console.error("Failed to load task:", e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Функция для обновления уровня студента
  const refreshStudentLevel = async () => {
    try {
      const level = await CodingTasksService.getStudentLevel();
      setStudentLevel(level);
    } catch (e) {
      console.error("Failed to refresh student level:", e);
    }
  };

  // Функция для проверки ограничений перед отправкой
  const validateConstraints = (): boolean => {
    if (!task || !task.constraints || task.constraints.length === 0) {
      setConstraintErrors([]);
      setConstraintsPassed(true);
      return true;
    }

    const result = checkConstraints(code, selectedLang, task.constraints);
    setConstraintErrors(result.errors);
    setConstraintsPassed(result.passed);
    
    return result.passed;
  };

  const handleLangChange = (lang: CodeLanguage) => {
    setSelectedLang(lang);
    setCode(task?.startCodes?.[lang] || "");
    setConsoleOutput("");
    setResult(null);
    setRawOutput("");
    setConstraintErrors([]);
    setConstraintsPassed(null);
  };

  const handleRun = async () => {
    if (!task) return;
    setRunLoading(true);
    setConsoleOutput("");
    try {
      let codeToRun = code;
      
      // Для Java и C# нужно модифицировать код для запуска с тестами
      if (selectedLang === "java" || selectedLang === "csharp") {
        const funcName = extractFunctionName(code, selectedLang);
        
        if (funcName && task.testCases && task.testCases.length > 0) {
          // Используем первый тест-кейс для быстрого запуска
          const firstTestCase = task.testCases[0];
          if (selectedLang === "java") {
            codeToRun = buildJavaTestSuite(code, [firstTestCase], funcName);
          } else if (selectedLang === "csharp") {
            codeToRun = buildCSharpTestSuite(code, [firstTestCase], funcName);
          }
        }
      }
      
      const res = await CodeService.executeCode({ language: selectedLang, code: codeToRun });

      // Для Java и C# показываем сырой вывод
      if (selectedLang === "java" || selectedLang === "csharp") {
        setConsoleOutput(res.output || "Код выполнен успешно (нет вывода)");
      } else {
        setConsoleOutput(res.error || res.output || "Нет вывода");
      }
    } catch (error: any) {
      setConsoleOutput(`Ошибка выполнения: ${error.message || error}`);
    } finally {
      setRunLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!task) return;
    
    // Сначала проверяем ограничения
    if (!validateConstraints()) {
      // Если ограничения не пройдены, показываем ошибки и не отправляем на сервер
      setResult(null);
      return;
    }
    
    setSubmitLoading(true);
    setResult(null);
    setRawOutput("");
    setShowSuccessModal(false);

    try {
      // Для Java и C# нужно модифицировать код перед отправкой
      let codeToSubmit = code;

      if (selectedLang === "java" || selectedLang === "csharp") {
        const funcName = extractFunctionName(code, selectedLang);

        if (!funcName) {
          alert(`Не удалось найти имя функции в коде. Убедитесь, что функция определена правильно для ${selectedLang === "java" ? "Java" : "C#"}.`);
          setSubmitLoading(false);
          return;
        }

        if (selectedLang === "java") {
          codeToSubmit = buildJavaTestSuite(code, task.testCases || [], funcName);
        } else if (selectedLang === "csharp") {
          codeToSubmit = buildCSharpTestSuite(code, task.testCases || [], funcName);
        }
      }

      const res = await CodingTasksService.submitSolution(task.id, codeToSubmit, selectedLang);

      // Для Java и C# нужно получить вывод из ответа сервера
      const responseOutput = (res as any).output || (res as any).message || '';
      setRawOutput(responseOutput);

      // Если результат пришел, но нужно обработать вывод для Java/C#
      if (res && res.results && (selectedLang === "java" || selectedLang === "csharp") && responseOutput) {
        // Парсим результаты для каждого теста
        const parsedResults = [];

        for (let i = 0; i < res.results.length; i++) {
          const testNum = i + 1;
          const { logs, result: actualResult } = parseTestOutput(responseOutput, testNum);
          const expected = res.results[i].expected;

          // Если не удалось получить результат из парсинга, используем дефолтное значение
          const actual = actualResult || res.results[i].actual || "";

          parsedResults.push({
            ...res.results[i],
            actual: actual || "пусто",
            passed: compareOutputs(actual, expected)
          });
        }

        // Обновляем результаты
        res.results = parsedResults;
        res.allPassed = parsedResults.every(r => r.passed);
      }

      setResult(res);

      // Обновляем уровень студента после отправки решения
      await refreshStudentLevel();

      // Показываем модальное окно, если все тесты пройдены И все ограничения соблюдены
      if (res.allPassed && res.experienceGained > 0 && constraintsPassed) {
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      console.error("Submit error:", e);
      alert(e?.message || "Ошибка отправки решения");
    } finally {
      setSubmitLoading(false);
    }
  };

  const getRequiredExp = (level: number) => Math.pow(10, level - 1);

  if (loading || !task) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingText}>Загрузка задачи...</div>
      </div>
    );
  }

  const diffColor = DIFF_COLORS[task.difficulty] || DIFF_COLORS.easy;
  const diffLabel = DIFF_LABELS[task.difficulty] || task.difficulty;
  const passedCount = result?.results?.filter((r) => r.passed).length ?? 0;
  const totalCount = result?.results?.length ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <button className={styles.backBtn} onClick={() => router.push("/problems")}>
            ← Назад к задачам
          </button>

          <div className={styles.taskInfo}>
            <h1 className={styles.taskTitle}>{task.title}</h1>
            <div className={styles.metaRow}>
              <span className={styles.badge} style={{ backgroundColor: diffColor }}>
                {diffLabel}
              </span>
              <span className={styles.xpBadge}>+{task.experienceReward} XP</span>
              <span className={styles.authorTag}>Автор: {task.authorName}</span>
            </div>
          </div>

          <div className={styles.description}>
            <h3>Описание</h3>
            <p>{task.description}</p>
          </div>

          {task.constraints && task.constraints.length > 0 && (
            <div className={styles.constraintsBox}>
              <h3>Ограничения</h3>
              {task.constraints.map((c, i) => (
                <div key={i} className={styles.constraintItem}>
                  {c.type === "maxTimeMs" && `⏱ Время выполнения: не более ${c.value}мс`}
                  {c.type === "maxLines" && `📏 Максимум строк кода: ${c.value}`}
                  {c.type === "forbiddenTokens" &&
                    `🚫 Запрещено использовать: ${(c.value as string[]).join(", ")}`}
                  {c.type === "noComments" && "💬 Комментарии запрещены"}
                  {c.type === "noConsoleLog" && "📢 Вывод в консоль запрещен"}
                  {c.type === "maxComplexity" && `🔄 Максимальная сложность: ${c.value}`}
                  {c.type === "memoryLimit" && `💾 Ограничение памяти: ${c.value} МБ`}
                  {c.type === "requiredKeywords" &&
                    `🔑 Обязательно использовать: ${(c.value as string[]).join(", ")}`}
                </div>
              ))}
            </div>
          )}

          {task.testCases && task.testCases.length > 0 && (
            <div className={styles.examplesBox}>
              <h3>Примеры</h3>
              {task.testCases.slice(0, 2).map((tc, i) => (
                <div key={i} className={styles.example}>
                  <div>
                    <strong>Вход:</strong> <code>{tc.input}</code>
                  </div>
                  <div>
                    <strong>Выход:</strong> <code>{tc.expectedOutput}</code>
                  </div>
                </div>
              ))}
              {task.testCases.length > 2 && (
                <p className={styles.moreTests}>
                  + ещё {task.testCases.length - 2} скрытых тестов
                </p>
              )}
            </div>
          )}

          {studentLevel && (
            <div className={styles.levelBox}>
              <div className={styles.levelRow}>
                <span>Уровень {studentLevel.level}</span>
                <span>
                  {studentLevel.experience} / {getRequiredExp(studentLevel.level)} XP
                </span>
              </div>
              <div className={styles.xpBar}>
                <div
                  className={styles.xpFill}
                  style={{
                    width: `${Math.min(
                      (studentLevel.experience / getRequiredExp(studentLevel.level)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.editorHeader}>
            <div className={styles.langSelector}>
              {(task.languages || []).map((lang) => (
                <button
                  key={lang}
                  className={`${styles.langBtn} ${selectedLang === lang ? styles.langBtnActive : ""}`}
                  onClick={() => handleLangChange(lang as CodeLanguage)}
                >
                  {LANG_LABELS[lang] || lang}
                </button>
              ))}
            </div>
            <div className={styles.editorActions}>
              <Button
                color="#374151"
                textColor="#fff"
                text={runLoading ? "..." : "▶ Запустить"}
                onClick={handleRun}
                disabled={runLoading}
                width="auto"
              />
              <Button
                color="#9F0FA7"
                textColor="#fff"
                text={submitLoading ? "Проверка..." : "Проверить"}
                onClick={handleSubmit}
                disabled={submitLoading}
                width="auto"
              />
            </div>
          </div>

          <div className={styles.editorWrap}>
            <CodeEditor
              key={selectedLang}
              value={code}
              onChange={setCode}
              language={selectedLang}
              height={400}
              onRun={handleRun}
              runLoading={runLoading}
            />
          </div>

          {/* Отображение ошибок ограничений */}
          {constraintErrors.length > 0 && <ConstraintErrors errors={constraintErrors} />}

          {consoleOutput && (
            <div className={styles.consoleBox}>
              <strong>Консоль</strong>
              <pre>{consoleOutput}</pre>
            </div>
          )}

          {result && (
            <div className={styles.resultsBox}>
              <div className={styles.resultsHeader}>
                <h3>{result.allPassed ? "Все тесты пройдены!" : "Есть ошибки"}</h3>
                <span
                  className={styles.resultsScore}
                  style={{ color: result.allPassed ? "#4caf50" : "#f44336" }}
                >
                  {passedCount}/{totalCount}
                </span>
              </div>

              {result.experienceGained > 0 && (
                <div className={styles.xpGained}>
                  +{result.experienceGained} XP | Уровень: {result.newLevel}
                </div>
              )}

              <div className={styles.testResults}>
                {result.results.map((r) => (
                  <div
                    key={r.index}
                    className={`${styles.testResult} ${
                      r.passed ? styles.testPassed : styles.testFailed
                    }`}
                  >
                    <div className={styles.testResultHeader}>
                      <span>Тест #{r.index + 1}</span>
                      <span>{r.passed ? "Пройден" : "Провален"}</span>
                    </div>
                    <div className={styles.testResultDetails}>
                      <span>Вход: {r.input}</span>
                      <span>Ожидалось: {r.expected}</span>
                      <span>Получено: {r.actual || "пусто"}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Отладочная информация для разработки */}
              {process.env.NODE_ENV === 'development' && rawOutput && (
                <div className={styles.debugBox}>
                  <strong>Отладка (сырой вывод):</strong>
                  <pre>{rawOutput}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно успеха */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        experienceGained={result?.experienceGained || 0}
        newLevel={result?.newLevel || studentLevel?.level || 1}
      />
    </div>
  );
}