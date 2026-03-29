"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import styles from "./page.module.scss";

import Button from "@/app/components/Button";
import CodeEditor from "@/app/components/CodeEditor";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import {
  type CodeConstraint,
  type CodeTask,
  CodingTasksService,
  type StudentLevel,
  type SubmitSolutionResult,
} from "@/app/http/codingTasksService";

const DIFF_COLORS: Record<string, string> = {
  easy: "#4caf50",
  medium: "#ff9800",
  hard: "#f44336",
};

const TYPE_LABELS: Record<string, string> = {
  int: "число (int)",
  string: "строка (string)",
  number: "число (number)",
  double: "число с плавающей точкой (double)",
  float: "число с плавающей точкой (float)",
  long: "длинное число (long)",
  boolean: "логическое значение (boolean)",
  char: "символ (char)",
  byte: "байт (byte)",
  short: "короткое число (short)",
  array: "массив",
  list: "список",
  map: "словарь (map)",
  object: "объект",
  void: "без возвращаемого значения",
  array_int: "массив чисел (int[])",
  array_string: "массив строк (String[])",
  array_double: "массив чисел (double[])",
  array_float: "массив чисел (float[])",
  array_long: "массив длинных чисел (long[])",
  array_boolean: "массив логических значений (boolean[])",
  array_char: "массив символов (char[])",
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
 
type CodeConstraintType =
  | "maxTimeMs"
  | "maxLines"
  | "forbiddenTokens"
  | "noComments"
  | "noConsoleLog"
  | "maxComplexity"
  | "memoryLimit"
  | "requiredKeywords";

interface TestCaseArgument {
  index: number;
  value: string;
  objectValues?: Record<string, string>;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  args?: TestCaseArgument[];
}

interface ArgumentSchema {
  name: string;
  type: string;
  className?: string;
  arrayElementType?: string;
  objectFields?: { name: string; type: string; value: string }[];
  arrayElementObjectFields?: { name: string; type: string; value: string }[];
  arrayElementClassName?: string;
}
 
const formatArgsForJavaOrCSharp = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: string
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  const cleanValue = (val: string) => {
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }

    return val;
  };

  const args = testCaseArgs.map((arg, idx) => {
    const scheme = argumentScheme[idx];

    if (!scheme) return null;

    const cleanVal = cleanValue(arg.value);

    if (scheme.type === "string") {
      return `"${cleanVal}"`;
    }

    if (scheme.type === "char") {
      return `'${cleanVal}'`;
    }

    if (scheme.type === "boolean") {
      return cleanVal.toLowerCase() === "true" ? "true" : "false";
    }

    if (scheme.type === "object" && scheme.objectFields) {
      const objValues = arg.objectValues ?? {};
      const fields = scheme.objectFields.map(f => {
        const val = cleanValue(objValues[f.name] ?? "");

        if (f.type === "string") {
          return `"${val}"`;
        } else if (f.type === "boolean") {
          return val.toLowerCase() === "true" ? "true" : "false";
        } else if (f.type === "double" || f.type === "float") {
          return val;
        } else if (f.type === "char") {
          return `'${val}'`;
        } else {
          return val;
        }
      });

      if (language === "java") {
        const className = scheme.className || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);

        return `new ${className}(${fields.join(", ")})`;
      } else if (language === "csharp") {
        const className = scheme.className || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);

        return `new ${className}(${fields.join(", ")})`;
      }

      return `{${fields.join(", ")}}`;
    }

    if (scheme.type && scheme.type.startsWith("array_")) {
      const elementType = scheme.type.replace("array_", "");
      const typeToUse = elementType === "string" ? "String" : elementType;

      if (arg.value && arg.value.trim().startsWith("[")) {
        try {
          const arr = JSON.parse(arg.value);

          if (Array.isArray(arr)) {
            const formatted = arr.map((item: any) => {
              if (elementType === "string") return `"${item}"`;

              if (elementType === "boolean") return item ? "true" : "false";

              return String(item);
            });

            if (language === "java") {
              return `new ${typeToUse}[] { ${formatted.join(", ")} }`;
            }

            return `new ${typeToUse}[] { ${formatted.join(", ")} }`;
          }
        } catch {}
      }

      if (arg.objectValues && Object.keys(arg.objectValues).length > 0) {
        const elements = Object.values(arg.objectValues).map((val: any) => {
          if (elementType === "string") return `"${val}"`;

          if (elementType === "boolean") return val.toLowerCase() === "true" ? "true" : "false";

          return String(val);
        });

        if (language === "java") {
          return `new ${typeToUse}[] { ${elements.join(", ")} }`;
        }

        return `new ${typeToUse}[] { ${elements.join(", ")} }`;
      }

      return `new ${typeToUse}[0]`;
    }

    if (scheme.type === "array" || scheme.type === "list") {
      const arrayElementType = scheme.arrayElementType ?? "int";

      if (scheme.arrayElementObjectFields) {
        const arrayObjValues = arg.objectValues ?? {};
        const elements = Object.entries(arrayObjValues).map(([key, val]) => {
          const objFields = scheme.arrayElementObjectFields!;
          const valObj = typeof val === "object" ? val as Record<string, string> : {};
          const fields = objFields.map(f => {
            const fieldVal = cleanValue(valObj?.[f.name] ?? "");

            if (f.type === "string") {
              return `"${fieldVal}"`;
            } else if (f.type === "boolean") {
              return fieldVal.toLowerCase() === "true" ? "true" : "false";
            } else if (f.type === "double" || f.type === "float") {
              return fieldVal;
            } else if (f.type === "char") {
              return `'${fieldVal}'`;
            } else {
              return fieldVal;
            }
          });

          const elemClassName = scheme.arrayElementClassName || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);

          if (language === "java") {
            return `new ${elemClassName}(${fields.join(", ")})`;
          }

          const csharpFields = objFields.map(f => {
            const fieldVal = cleanValue(valObj?.[f.name] ?? "");

            if (f.type === "string") {
              return `"${fieldVal}"`;
            } else if (f.type === "boolean") {
              return fieldVal.toLowerCase() === "true" ? "true" : "false";
            } else {
              return fieldVal;
            }
          });

          return `new ${elemClassName}(${csharpFields.join(", ")})`;
        });
        const arrClassName = scheme.arrayElementClassName || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);

        return `new ${arrClassName}[] { ${elements.join(", ")} }`;
      }

      if (arg.value && arg.value.trim().startsWith("[")) {
        try {
          const arr = JSON.parse(arg.value);

          if (Array.isArray(arr)) {
            const formatted = arr.map(item => {
              if (arrayElementType === "string") return `"${item}"`;

              if (arrayElementType === "boolean") return item ? "true" : "false";

              return String(item);
            });

            return `new ${arrayElementType}[] { ${formatted.join(", ")} }`;
          }
        } catch {}
      }

      return `new ${arrayElementType}[0]`;
    }

    return arg.value;
  }).filter(a => a !== null).join(", ");

  return args;
};
 
const formatArgsForDynamicLang = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: string
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  return testCaseArgs.map((arg, idx) => {
    const scheme = argumentScheme[idx];

    if (!scheme) return arg.value;

    if (scheme.type === "string") {
      return `"${arg.value}"`;
    }

    if (scheme.type === "object" && arg.objectValues) {
      return JSON.stringify(arg.objectValues);
    }

    if ((scheme.type === "array" || scheme.type === "list") && arg.value) {
      try {
        return JSON.stringify(JSON.parse(arg.value));
      } catch {
        return arg.value;
      }
    }

    return arg.value;
  }).join(", ");
};
 
const getDisplayInput = (
  testCase: TestCase,
  argumentScheme: ArgumentSchema[] | undefined,
  language: string
): string => {
  if (!testCase) return "";

  if (testCase.args && testCase.args.length > 0 && argumentScheme && argumentScheme.length > 0) {
    if (language === "java" || language === "csharp") {
      return formatArgsForJavaOrCSharp(testCase.args, argumentScheme, language);
    }

    if (language === "javascript" || language === "python") {
      return formatArgsForDynamicLang(testCase.args, argumentScheme, language);
    }
  }

  return testCase.input ?? "";
};
 
interface ConstraintCheckResult {
  passed: boolean;
  errors: string[];
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

const parseArguments = (input: string): any[] => {
  if (!input.trim()) return [];

  try {
    if (input.trim().startsWith("[") && input.trim().endsWith("]")) {
      return JSON.parse(input);
    }
  } catch {
   
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
 
const buildJavaTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string; args?: TestCaseArgument[] }[],
  funcName: string | null,
  argumentScheme?: ArgumentSchema[]
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      let argsStr = "";
 
      if (tc.args && tc.args.length > 0 && argumentScheme && argumentScheme.length > 0) {
        argsStr = formatArgsForJavaOrCSharp(tc.args, argumentScheme, "java");
      } else if (tc.input) {
    
        const args = parseArguments(tc.input);

        argsStr = formatArgumentsForCode(args);
      }

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
 
const buildCSharpTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string; args?: TestCaseArgument[] }[],
  funcName: string | null,
  argumentScheme?: ArgumentSchema[]
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      const testNum = index + 1;
      let argsStr = "";
 
      if (tc.args && tc.args.length > 0 && argumentScheme && argumentScheme.length > 0) {
        argsStr = formatArgsForJavaOrCSharp(tc.args, argumentScheme, "csharp");
      } else if (tc.input) {
      
        const args = parseArguments(tc.input);

        argsStr = formatArgumentsForCode(args);
      }

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
 
  const usings = `using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
`;
 
  if (userCode.includes("using System;")) {
   
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
 
const getTypeString = (type: string, language: string): string => {
  const typeMap: Record<string, Record<string, string>> = {
    int: { javascript: "", python: "int", csharp: "int", java: "int", golang: "int", cpp: "int" },
    string: { javascript: "", python: "str", csharp: "string", java: "String", golang: "string", cpp: "string" },
    number: { javascript: "number", python: "float", csharp: "double", java: "double", golang: "float64", cpp: "double" },
    boolean: { javascript: "", python: "bool", csharp: "bool", java: "boolean", golang: "bool", cpp: "bool" },
    double: { javascript: "", python: "float", csharp: "double", java: "double", golang: "float64", cpp: "double" },
    float: { javascript: "", python: "float", csharp: "float", java: "float", golang: "float32", cpp: "float" },
    long: { javascript: "", python: "int", csharp: "long", java: "long", golang: "int64", cpp: "long" },
    char: { javascript: "", python: "str", csharp: "char", java: "char", golang: "rune", cpp: "char" },
    byte: { javascript: "", python: "bytes", csharp: "byte", java: "byte", golang: "byte", cpp: "byte" },
    short: { javascript: "", python: "int", csharp: "short", java: "short", golang: "int16", cpp: "short" },
    object: { javascript: "", python: "", csharp: "object", java: "Object", golang: "interface{}", cpp: "object" },
    array: { javascript: "", python: "list", csharp: "object", java: "int[]", golang: "[]int", cpp: "vector" },
    array_int: { javascript: "", python: "list", csharp: "int[]", java: "int[]", golang: "[]int", cpp: "vector" },
    array_string: { javascript: "", python: "list", csharp: "string[]", java: "String[]", golang: "[]string", cpp: "vector" },
    array_double: { javascript: "", python: "list", csharp: "double[]", java: "double[]", golang: "[]float64", cpp: "vector" },
    array_float: { javascript: "", python: "list", csharp: "float[]", java: "float[]", golang: "[]float32", cpp: "vector" },
    array_long: { javascript: "", python: "list", csharp: "long[]", java: "long[]", golang: "[]int64", cpp: "vector" },
    array_boolean: { javascript: "", python: "list", csharp: "bool[]", java: "boolean[]", golang: "[]bool", cpp: "vector" },
    array_char: { javascript: "", python: "list", csharp: "char[]", java: "char[]", golang: "[]rune", cpp: "vector" },
    list: { javascript: "", python: "list", csharp: "List<object>", java: "List<Object>", golang: "[]interface{}", cpp: "vector" },
    map: { javascript: "Object", python: "dict", csharp: "Dictionary<string, object>", java: "Map<String, Object>", golang: "map[string]interface{}", cpp: "map" },
    void: { javascript: "void", python: "None", csharp: "void", java: "void", golang: "", cpp: "void" },
  };

  return typeMap[type]?.[language] ?? type;
};
 
const generateObjectClasses = (args: ArgumentSchema[], language: string): string => {
  const objectArgs = args.filter((a) => a.type === "object" && a.objectFields);

  const arrayObjectArgs = args.filter(
    (a) =>
      (a.type === "array" || a.type === "list") &&
      a.arrayElementType === "object" &&
      a.arrayElementObjectFields
  );

  const allClasses = [...objectArgs, ...arrayObjectArgs];

  if (allClasses.length === 0) return "";

  return allClasses
    .map((arg) => {
      let className: string;
      const objectFields = arg.objectFields ?? arg.arrayElementObjectFields ?? [];

      if (arg.objectFields) {
        className = arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      } else if (arg.arrayElementObjectFields) {
        className = arg.arrayElementClassName || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      } else {
        className = arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      }

      if (language === "java") {
        const accessModifier = "private";
        const fields = objectFields.map((f) => `        ${accessModifier} ${getTypeString(f.type, language)} ${f.name};`).join("\n");
        const constructorParams = objectFields.map((f) => `${getTypeString(f.type, language)} ${f.name}`).join(", ");
        const constructorBody = objectFields.map((f) => `this.${f.name} = ${f.name};`).join("\n        ");
        const constructor = objectFields.length > 0 ?
          `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }` : "";
        const gettersSetters = objectFields
          .map((f) => {
            const fieldName = f.name;
            const fieldType = getTypeString(f.type, language);

            return `
    public ${fieldType} get${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}() {
        return ${fieldName};
    }
    public void set${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(${fieldType} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`;
          })
          .join("");

        return `    class ${className} {
${fields}
${constructor}
${gettersSetters}
    }`;
      }

      if (language === "csharp") {
        const fields = objectFields.map((f) => `        public ${getTypeString(f.type, language)} ${f.name};`).join("\n");
        const constructorParams = objectFields.map((f) => `${getTypeString(f.type, language)} ${f.name}`).join(", ");
        const constructorBody = objectFields.map((f) => `this.${f.name} = ${f.name};`).join("\n        ");
        const constructor = objectFields.length > 0 ?
          `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }` : "";
        const gettersSetters = objectFields
          .map((f) => {
            const fieldName = f.name;
            const fieldType = getTypeString(f.type, language);

            return `
    public ${fieldType} get${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}() {
        return ${fieldName};
    }
    public void set${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(${fieldType} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`;
          })
          .join("");

        return `public class ${className} {
${fields.replace(/ {8}/g, "    ")}
${constructor.replace(/ {8}/g, "    ")}
${gettersSetters}
}`;
      }

      return "";
    })
    .join("\n\n");
};
 
const compareOutputs = (actual: string, expected: string): boolean => {
  
  const normalizedActual = actual.replace(/\s+/g, '').trim();
  const normalizedExpected = expected.replace(/\s+/g, '').trim();
  
  if (normalizedActual === normalizedExpected) return true;
  
  try {
 
    const actualObj = JSON.parse(actual);
    const expectedObj = JSON.parse(expected);

    return JSON.stringify(actualObj) === JSON.stringify(expectedObj);
  } catch {
    
    return actual.trim() === expected.trim();
  }
};


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
      
          const tokenRegex = new RegExp(`\\b${token}\\b`, 'g');

          if (tokenRegex.test(code)) {
            errors.push(`Использование запрещенного токена: "${token}"`);
          }
        }

        break;

      case "noComments":
        if (constraint.value === true) {
       
          let hasComments = false;
          
          if (language === "javascript" || language === "java" || language === "csharp" || language === "cpp" || language === "golang") {
         
            hasComments = /\/\/.*|\/\*[\s\S]*?\*\//.test(code);
          } else if (language === "python") {
 
            hasComments = /#.*/.test(code);
          }
          
          if (hasComments) {
            errors.push("Использование комментариев запрещено");
          }
        }

        break;

      case "noConsoleLog":
        if (constraint.value === true) {
         
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
    
        const complexity = estimateCodeComplexity(code, language);

        if (complexity > constraint.value) {
          errors.push(`Превышена максимальная сложность кода: ${complexity} > ${constraint.value}`);
        }

        break;

      case "memoryLimit":
  
        break;

      case "maxTimeMs":
   
        break;

      case "requiredKeywords":
        const requiredKeywords = constraint.value as string[];

        for (const keyword of requiredKeywords) {
      
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


const estimateCodeComplexity = (code: string, language: CodeLanguage): number => {
  let complexity = 1;

  const loopPatterns = [
    /\bfor\s*\(/g,  
    /\bwhile\s*\(/g, 
    /\bdo\s*\{/g, 
    /\bforeach\s*\(/g, 
    /\bfor\s+\w+\s+in\b/g,  
  ];

  for (const pattern of loopPatterns) {
    const matches = code.match(pattern);

    if (matches) {
      complexity += matches.length;
    }
  }

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
        <div className={styles.modalIcon}></div>
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


const ConstraintErrors = ({ errors }: { errors: string[] }) => {
  if (errors.length === 0) return null;

  return (
    <div className={styles.constraintErrors}>
      <div className={styles.constraintErrorsHeader}>
        <span>Нарушены ограничения:</span>
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

  const refreshStudentLevel = async () => {
    try {
      const level = await CodingTasksService.getStudentLevel();

      setStudentLevel(level);
    } catch (e) {
      console.error("Failed to refresh student level:", e);
    }
  };

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
      const argumentScheme = (task as any).argumentScheme;
      const taskTestCases = (task as any).testCasesByLanguage?.[selectedLang] || task.testCases || [];
      
      if (selectedLang === "java" || selectedLang === "csharp") {
        const funcName = extractFunctionName(code, selectedLang);

        if (funcName && taskTestCases.length > 0) {
       
          const firstTestCase = taskTestCases[0];

          if (selectedLang === "java") {
            codeToRun = buildJavaTestSuite(code, [firstTestCase], funcName, argumentScheme);
          } else if (selectedLang === "csharp") {
            codeToRun = buildCSharpTestSuite(code, [firstTestCase], funcName, argumentScheme);
          }
        }
      }
      
      const res = await CodeService.executeCode({ language: selectedLang, code: codeToRun });

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
    
    if (!validateConstraints()) {
   
      setResult(null);
 
      if (constraintErrors.length > 0) {
        alert(`Ограничения не пройдены:\n\n${constraintErrors.join("\n")}\n\nИсправьте код и попробуйте снова.`);
      }

      return;
    }
    
    setSubmitLoading(true);
    setResult(null);
    setRawOutput("");
    setShowSuccessModal(false);

    try {
   
      let codeToSubmit = code;

      if (selectedLang === "java" || selectedLang === "csharp") {
        const funcName = extractFunctionName(code, selectedLang);

        if (!funcName) {
          alert(`Не удалось найти имя функции в коде. Убедитесь, что функция определена правильно для ${selectedLang === "java" ? "Java" : "C#"}.`);
          setSubmitLoading(false);

          return;
        }

        const argumentScheme = (task as any).argumentScheme;
        const taskTestCases = (task as any).testCasesByLanguage?.[selectedLang] || task.testCases || [];

        if (selectedLang === "java") {
          codeToSubmit = buildJavaTestSuite(code, taskTestCases, funcName, argumentScheme);
        } else if (selectedLang === "csharp") {
          codeToSubmit = buildCSharpTestSuite(code, taskTestCases, funcName, argumentScheme);
        }
      }

      const res = await CodingTasksService.submitSolution(task.id, codeToSubmit, selectedLang);
 
      const responseOutput = (res as any).output || (res as any).message || '';

      setRawOutput(responseOutput);
 
      if (res && res.results && (selectedLang === "java" || selectedLang === "csharp") && responseOutput) {
        
        const parsedResults = [];

        for (let i = 0; i < res.results.length; i++) {
          const testNum = i + 1;
          const { logs, result: actualResult } = parseTestOutput(responseOutput, testNum);
          const expected = res.results[i].expected;

          
          const actual = actualResult || res.results[i].actual || "";

          parsedResults.push({
            ...res.results[i],
            actual: actual || "пусто",
            passed: compareOutputs(actual, expected)
          });
        }

        
        res.results = parsedResults;
        const serverConstraintsPassed = (res as any).constraintsPassed ?? constraintsPassed;
        const serverConstraintErrors = (res as any).constraintErrors ?? constraintErrors;
        
        
        res.allPassed = parsedResults.every(r => r.passed) && serverConstraintsPassed;
        
     
        if (serverConstraintErrors && serverConstraintErrors.length > 0) {
          setConstraintErrors(serverConstraintErrors);
          setConstraintsPassed(serverConstraintsPassed);
        }
      }

      setResult(res);

    
      await refreshStudentLevel();

     
      const finalConstraintsPassed = (res as any).constraintsPassed ?? constraintsPassed;

      if (res.allPassed && res.experienceGained > 0 && finalConstraintsPassed) {
        setShowSuccessModal(true);
      } else if ((res as any).constraintErrors && (res as any).constraintErrors.length > 0) {
      
        setConstraintErrors((res as any).constraintErrors);
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
  const visibleResults = (result?.results || []).slice(0, 3);
  const hiddenResultsCount = Math.max(0, totalCount - visibleResults.length);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <button className={styles.backBtn} onClick={() => router.push("/problems")}>
             Назад к задачам
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
            {(task.tags || []).length > 0 && (
              <div className={styles.taskTags}>
                {(task.tags || []).map((tag) => (
                  <span key={tag} className={styles.taskTag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.description}>
            <h3>Описание</h3>
            <p>{task.description}</p>
          </div>

          {(task as any).argumentScheme && (task as any).argumentScheme.length > 0 && (
            <div className={styles.constraintsBox}>
              <h3>Аргументы функции</h3>
              {(task as any).argumentScheme.map((arg: ArgumentSchema, i: number) => (
                <div key={i} className={styles.constraintItem}>
                  <strong>{arg.name}</strong>: {TYPE_LABELS[arg.type] || arg.type}
                  {arg.objectFields && arg.objectFields.length > 0 && (
                    <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
                      {arg.objectFields.map((field: any, fi: number) => (
                        <li key={fi}>
                          {field.name}: {TYPE_LABELS[field.type] || field.type}
                        </li>
                      ))}
                    </ul>
                  )}
                  {arg.arrayElementObjectFields && arg.arrayElementObjectFields.length > 0 && (
                    <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
                      <li>Массив объектов с полями:</li>
                      {arg.arrayElementObjectFields.map((field: any, fi: number) => (
                        <li key={fi}>
                          {field.name}: {TYPE_LABELS[field.type] || field.type}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {(task as any).returnType && (
            <div className={styles.constraintsBox}>
              <h3>Возвращаемое значение</h3>
              <div className={styles.constraintItem}>
                {TYPE_LABELS[(task as any).returnType] || (task as any).returnType}
              </div>
            </div>
          )}

          {task.constraints && task.constraints.length > 0 && (
            <div className={styles.constraintsBox}>
              <h3>Ограничения</h3>
              {task.constraints.map((c, i) => (
                <div key={i} className={styles.constraintItem}>
                  {c.type === "maxTimeMs" && ` Время выполнения: не более ${c.value}мс`}
                  {c.type === "maxLines" && ` Максимум строк кода: ${c.value}`}
                  {c.type === "forbiddenTokens" &&
                    ` Запрещено использовать: ${(c.value as string[]).join(", ")}`}
                  {c.type === "noComments" && " Комментарии запрещены"}
                  {c.type === "noConsoleLog" && " Вывод в консоль запрещен"}
                  {c.type === "maxComplexity" && `Максимальная сложность: ${c.value}`}
                  {c.type === "memoryLimit" && ` Ограничение памяти: ${c.value} МБ`}
                  {c.type === "requiredKeywords" &&
                    ` Обязательно использовать: ${(c.value as string[]).join(", ")}`}
                </div>
              ))}
            </div>
          )}

          {(() => {
            const argScheme = (task as any).argumentScheme;
            const langTestCases = (task as any).testCasesByLanguage?.[selectedLang] || task.testCases || [];

            if (langTestCases.length === 0) return null;

            const objectClassesCode = generateObjectClasses(argScheme || [], selectedLang);

            return (
            <div className={styles.examplesBox}>
              {objectClassesCode && (selectedLang === "java" || selectedLang === "csharp") && (
                <>
                  <h3>Классы объектов</h3>
                  <pre className={styles.codeBlock}>{objectClassesCode}</pre>
                </>
              )}

              <h3>Примеры</h3>
              {langTestCases.slice(0, 3).map((tc: TestCase, i: number) => (
                <div key={i} className={styles.example}>
                  <div>
                    <strong>Вход:</strong> <code>{getDisplayInput(tc, argScheme, selectedLang)}</code>
                  </div>
                  <div>
                    <strong>Выход:</strong> <code>{tc.expectedOutput}</code>
                  </div>
                </div>
              ))}
              {langTestCases.length > 3 && (
                <p className={styles.moreTests}>
                  + ещё {langTestCases.length - 3} скрытых тестов
                </p>
              )}
            </div>
            );
          })()}

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
                {visibleResults.map((r) => (
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
                  </div>
                ))}
              </div>
              {hiddenResultsCount > 0 && (
                <p className={styles.moreResults}>
                  Ещё {hiddenResultsCount} тестов скрыто
                </p>
              )}
              
          
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

 
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        experienceGained={result?.experienceGained || 0}
        newLevel={result?.newLevel || studentLevel?.level || 1}
      />
    </div>
  );
}
