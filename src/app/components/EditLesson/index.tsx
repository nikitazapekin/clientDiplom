// EditLesson.tsx (полный исправленный файл)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import Button from "../Button";
import CodeEditor from "../CodeEditor";

import styles from "./index.module.scss";
import type {
  ArgumentSchema,
  ArgumentType,
  CodeConstraintType,
  CodeExampleBlock,
  CodeTaskBlock,
  ImageBlock,
  Slide,
  SlideBlock,
  SlideType,
  SourceBlock,
  TableBlock,
  TestCaseArgument,
  TextBlock,
  TheoryQuestionBlock,
} from "./types";

import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import { LessonDetailsService } from "@/app/http/lessonDetailsService";

/* eslint-disable */
const genId = () =>
  `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${performance.now()}`;

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "golang", label: "Go" },
  { value: "cpp", label: "C++" },
];

const createTextBlock = (order: number): TextBlock => ({
  id: genId(),
  order,
  type: "text",
  content: "",
});

const createCodeExampleBlock = (order: number): CodeExampleBlock => ({
  id: genId(),
  order,
  type: "codeExample",
  code: "",
  language: "javascript",
  runnable: false,
});

const createSourceBlock = (order: number): SourceBlock => ({
  id: genId(),
  order,
  type: "source",
  url: "",
  note: "",
});

const createTableBlock = (order: number, rows = 2, cols = 2): TableBlock => ({
  id: genId(),
  order,
  type: "table",
  rows,
  cols,
  cells: Array(rows)
    .fill(null)
    .map(() => Array(cols).fill("")),
});

const createImageBlock = (order: number): ImageBlock => ({
  id: genId(),
  order,
  type: "image",
  url: "",
  file: null,
});

const stripMainMethod = (code: string, language: CodeLanguage): string => {
  if (language === "java") {
    return code
      .replace(/public\s+static\s+void\s+main\s*\(String\[\]\s*args\)\s*\{[\s\S]*?\}\s*\n?/g, "")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();
  }
  if (language === "csharp") {
    return code
      .replace(/public\s+static\s+void\s+Main\s*\(string\[\]\s*args\)\s*\{[\s\S]*?\}\s*\n?/g, "")
      .trim();
  }
  return code;
};

// Исправленный addJavaMainMethod для Java с поддержкой логов
const addJavaMainMethod = (code: string, funcName: string | null, input: string = "5"): string => {
  if (!funcName) return code;

  const mainMethod = `
    public static void main(String[] args) {
        // Создаем поток для перехвата System.out
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream originalOut = System.out;
        System.setOut(new java.io.PrintStream(baos));
        
        try {
            Object result = ${funcName}(${input});
            
        
            System.setOut(originalOut);
           
            String logs = baos.toString();
            
           
            if (!logs.isEmpty()) {
                System.out.println("===LOGS_START===");
                System.out.print(logs);
                System.out.println("===LOGS_END===");
            }
            
         
            System.out.println("===RESULT_START===");
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
            System.out.println("===RESULT_END===");
            
        } catch (Exception e) {
            System.setOut(originalOut);
            System.out.println("===RESULT_START===");
            System.out.print("{\\"error\\":\\"" + e.getMessage() + "\\"}");
            System.out.println("===RESULT_END===");
        }
    }`;

  if (code.includes("public static void main")) {
    return code.replace(
      /public\s+static\s+void\s+main\(String\[\]\s*args\)\s*\{[\s\S]*?\}/,
      mainMethod
    );
  } else {
    const codeWithoutLastBrace = code.trim().replace(/\}\s*$/, "");
    return `${codeWithoutLastBrace}\n${mainMethod}\n}`;
  }
};

// Функция для парсинга аргументов из строки с запятыми
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

// Добавьте эту функцию после buildJavaTestSuite

const buildCSharpTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string }[],
  funcName: string | null
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      const testNum = index + 1;
      const argsStr = tc.input || "";

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
using System.Text.Json.Serialization;
using System.Collections.Generic;
`;

  // Проверяем, есть ли уже using директивы - удаляем все существующие usings и добавляем свои
  return (
    usings +
    "\n" +
    userCode.replace(/^using.*;(\r\n|\r|\n)?/gm, "")
  ) +
  `
    
public class Runner {
    public static void Main() {
${testCasesCode}
    }
}`;
};

// Улучшенная функция для Java с поддержкой нескольких тест-кейсов и логов
const buildJavaTestSuiteWithLogs = (
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
                    System.out.print("\\"");
                    System.out.print(result);
                    System.out.print("\\"");
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
const buildJavaTestSuite = (
  userCode: string,
  testCases: { input: string; expectedOutput: string }[],
  funcName: string | null
): string => {
  if (!funcName) return userCode;

  const testCasesCode = testCases
    .map((tc, index) => {
      const testNum = index + 1;
      const argsStr = tc.input;

      return `
        // Тест ${testNum}
        {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            java.io.PrintStream originalOut = System.out;
            System.setOut(new java.io.PrintStream(baos));
            
            try {
                Object result = ${funcName}(${argsStr});
                
                System.setOut(originalOut);
                
                String logs = baos.toString();
                
                // Выводим логи если есть
                if (logs != null && !logs.isEmpty()) {
                    System.out.println("===LOGS_START_" + ${testNum} + "===");
                    System.out.print(logs);
                    if (!logs.endsWith("\\n")) {
                        System.out.println();
                    }
                    System.out.println("===LOGS_END_" + ${testNum} + "===");
                }
                
                // Выводим результат
                System.out.println("===RESULT_START_" + ${testNum} + "===");
                if (result == null) {
                    System.out.print("null");
                } else if (result instanceof String) {
                    System.out.print("\\"");
                    System.out.print(result);
                    System.out.print("\\"");
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
                System.out.println();
                System.out.println("===RESULT_END_" + ${testNum} + "===");
                
            } catch (Exception e) {
                System.setOut(originalOut);
                System.out.println("===RESULT_START_" + ${testNum} + "===");
                System.out.print("ERROR: " + e.getMessage());
                System.out.println();
                System.out.println("===RESULT_END_" + ${testNum} + "===");
            }
        }`;
    })
    .join("\n");

  // Если есть main метод, заменяем его
  if (userCode.includes("public static void main")) {
    return userCode.replace(
      /public\s+static\s+void\s+main\(String\[\]\s*args\)\s*\{[\s\S]*?\}/,
      `public static void main(String[] args) {
${testCasesCode}
    }`
    );
  } else {
    // Добавляем main метод в конец
    // Удаляем только последнюю закрывающую скобку Main класса (перед возможными дополнительными классами)
    const trimmedCode = userCode.trim();
    
    // Ищем позицию последней } которая закрывает класс Main
    // Для этого ищем структуру: class Main { ... }
    const mainClassEnd = trimmedCode.lastIndexOf('}');
    
    let codeWithoutMainBrace: string;
    if (mainClassEnd > 0) {
      // Проверяем что после этой } есть еще код (классы)
      const afterBrace = trimmedCode.substring(mainClassEnd + 1).trim();
      if (afterBrace.length > 0) {
        // Есть дополнительные классы после Main - удаляем только последнюю скобку Main
        codeWithoutMainBrace = trimmedCode.substring(0, mainClassEnd);
      } else {
        // Нет дополнительных классов - просто удаляем последнюю скобку
        codeWithoutMainBrace = trimmedCode.replace(/\}\s*$/, "");
      }
    } else {
      codeWithoutMainBrace = trimmedCode.replace(/\}\s*$/, "");
    }
    
    return `${codeWithoutMainBrace}

    public static void main(String[] args) {
${testCasesCode}
    }
}`;
  }
};

const getDefaultStarterCode = (
  language: CodeLanguage,
  args: ArgumentSchema[] = [],
  returnType: ArgumentType = "int"
): string => {
  const argsStr = args
    .map((arg) => {
      let typeStr: string;
      if (arg.type === "array") {
        typeStr = getArrayTypeString(arg, language);
      } else if (arg.type === "list") {
        typeStr = getListTypeString(arg, language);
      } else if (arg.type === "object" && arg.className) {
        // Use custom class name for object types
        typeStr = arg.className;
      } else {
        typeStr = getTypeString(arg.type, language);
      }
      return `${typeStr} ${arg.name}`;
    })
    .join(", ");

  const retTypeStr = getReturnTypeString(returnType, language);
  const returnValue = getDefaultReturnValue(returnType, language);

  switch (language) {
    case "csharp":
      return `using System;

public class Program
{
    public static ${retTypeStr} YourFunction(${argsStr})
    {
        // Ваш код здесь
        Console.WriteLine("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""});
        ${returnValue}
    }
}`;
    case "java":
      return `public class Main {
    public static ${retTypeStr} yourFunction(${argsStr}) {
        // Ваш код здесь
        System.out.println("HELLO"${args.length > 0 ? ` + " " + ${args.map((a) => a.name).join(' + " " + ')}` : ""});
        ${returnValue}
    }
}`;
    case "python":
      const pythonArgs = args.map((a) => a.name).join(", ");
      return `def your_function(${pythonArgs}):
    # Ваш код здесь
    print("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""})
    ${returnValue}`;
    case "golang":
      const goArgsStr = args
        .map((arg) => {
          const typeStr = getTypeString(arg.type, "golang");
          return `${arg.name} ${typeStr}`;
        })
        .join(", ");
      const goRetStr = getReturnTypeString(returnType, "golang");

      return `package main

import "fmt"

func yourFunction(${goArgsStr}) ${goRetStr} {
    // Ваш код здесь
    fmt.Println("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""})
    ${returnValue}
}`;
    default:
      const jsArgs = args.map((a) => a.name).join(", ");
      return `function yourFunction(${jsArgs}) {
    // Ваш код здесь
    console.log("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""});
    ${returnValue}
}`;
  }
};

const getTypeString = (type_: ArgumentType, language: CodeLanguage): string => {
  const typeMap: Record<ArgumentType, Record<CodeLanguage, string>> = {
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
  return typeMap[type_]?.[language] ?? type_;
};

const getReturnTypeString = (type_: ArgumentType, language: CodeLanguage): string => {
  if (type_ === "void") {
    return language === "java" || language === "csharp" || language === "cpp" ? "void" : "";
  }
  if (type_ === "object") {
    return language === "java" ? "Object" : language === "golang" ? "interface{}" : "object";
  }
  if (type_ === "list") {
    return language === "csharp" ? "List<object>" : language === "java" ? "List<Object>" : language === "golang" ? "[]interface{}" : "object";
  }
  return getTypeString(type_, language);
};

const getDefaultReturnValue = (type_: ArgumentType, language?: CodeLanguage): string => {
  const isPython = language === "python";
  const isGo = language === "golang";

  switch (type_) {
    case "int":
    case "long":
    case "short":
    case "byte":
    case "double":
    case "float":
    case "array_int":
    case "array_double":
    case "array_float":
    case "array_long":
    case "array_char":
      if (isPython) return "return None";
      if (isGo) return "return 0";
      return "return null;";
    case "string":
      if (isPython) return 'return ""';
      if (isGo) return 'return ""';
      return 'return "";';
    case "boolean":
    case "array_boolean":
      if (isPython) return "return False";
      if (isGo) return "return false";
      return "return false;";
    case "char":
      if (isPython) return 'return ""';
      if (isGo) return "return ''";
      return "return 'a';";
    case "object":
    case "array":
    case "array_string":
    case "list":
    case "map":
      if (isPython) return "return None";
      if (isGo) return "return nil";
      return "return null;";
    case "void":
      if (isPython) return "";
      if (isGo) return "";
      return "";
    default:
      if (isPython) return "return None";
      if (isGo) return "return nil";
      return "return null;";
  }
};

const generateObjectClasses = (args: ArgumentSchema[], language: CodeLanguage): string => {
  const objectArgs = args.filter((a) => a.type === "object" && a.objectFields);
  
  const arrayObjectArgs = args.filter(
    (a) => (a.type === "array" || a.type === "list") && 
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
        const constructorParams = objectFields.map(f => `${getTypeString(f.type, language)} ${f.name}`).join(", ");
        const constructorBody = objectFields.map(f => `this.${f.name} = ${f.name};`).join("\n        ");
        const constructor = objectFields.length > 0 ? `
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
        const constructorParams = objectFields.map(f => `${getTypeString(f.type, language)} ${f.name}`).join(", ");
        const constructorBody = objectFields.map(f => `this.${f.name} = ${f.name};`).join("\n        ");
        const constructor = objectFields.length > 0 ? `
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
${fields.replace(/        /g, "    ")}
${constructor.replace(/        /g, "    ")}
${gettersSetters}
}`;
      }
      if (language === "javascript") {
        const constructorParams = objectFields.map(f => f.name).join(", ");
        const constructorBody = objectFields.map(f => `this.${f.name} = ${f.name};`).join("\n    ");
        const constructor = objectFields.length > 0 ? `
class ${className} {
    constructor(${constructorParams}) {
        ${constructorBody}
    }
}` : `
class ${className} {
}`;
        return constructor;
      }
      if (language === "python") {
        const constructorParams = objectFields.map(f => f.name).join(", ");
        const constructorBody = objectFields.map(f => `self.${f.name} = ${f.name}`).join("\n        ");
        const constructor = objectFields.length > 0 ? `
class ${className}:
    def __init__(self, ${constructorParams}):
        ${constructorBody}` : `
class ${className}:
    pass`;
        return constructor;
      }
      return "";
    })
    .join("\n\n");
};

const createCodeTaskBlock = (order: number): CodeTaskBlock => ({
  id: genId(),
  order,
  type: "codeTask",
  runnable: true,
  language: "javascript",
  startCode: getDefaultStarterCode("javascript"),
  testCases: [],
  constraints: [],
  argumentScheme: [],
  returnType: "int",
});

const createTheoryQuestionBlock = (order: number): TheoryQuestionBlock => ({
  id: genId(),
  order,
  type: "theoryQuestion",
  options: ["", ""],
  correctIndex: 0,
});

function sortBlocks(blocks: SlideBlock[]): SlideBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

// Упрощенный StableCodeEditor без лишних состояний
function StableCodeEditor({
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
  // Используем useRef для хранения уникального ID, который не меняется при ререндерах
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

function SourceModal({
  isOpen,
  onClose,
  sources,
}: {
  isOpen: boolean;
  onClose: () => void;
  sources: { url: string; note?: string }[];
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Источники</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {sources.length === 0 ? (
            <p>Нет источников</p>
          ) : (
            <ul className={styles.sourcesList}>
              {sources.map((source, index) => (
                <li key={index} className={styles.sourceItem}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    {source.url}
                  </a>
                  {source.note && <p className={styles.sourceNote}>{source.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ResultsModal компонент с анимацией падающих звезд
// ResultsModal компонент с анимацией падающих звезд
function ResultsModal({
  isOpen,
  onClose,
  results,
  totalTasks,
  completedTasks,
  totalTestCases,
  passedTestCases,
  constraintsPassed,
  slides, // Добавляем slides как пропс
}: {
  isOpen: boolean;
  onClose: () => void;
  results: {
    slideId: string;
    title: string;
    passed: boolean;
    testCasesPassed: number;
    testCasesTotal: number;
    constraintsPassed: boolean;
  }[];
  totalTasks: number;
  completedTasks: number;
  totalTestCases: number;
  passedTestCases: number;
  constraintsPassed: boolean;
  slides: Slide[]; // Добавляем тип Slide[]
}) {
  const [stars, setStars] = useState(0);
  const [animatingStars, setAnimatingStars] = useState<number[]>([]);
  const [showStars, setShowStars] = useState(false);

  // Рассчитываем количество звезд при открытии модалки
  useEffect(() => {
    if (isOpen) {
      // Сбрасываем состояние
      setStars(0);
      setAnimatingStars([]);
      setShowStars(false);

      // Определяем количество звезд
      const theoryTasks = results.filter((r: { slideId: string }) => {
        const slide = slides.find((s: Slide) => s.id === r.slideId);
        return slide?.blocks.some((b: SlideBlock) => b.type === "theoryQuestion");
      });

      const theoryPassed = theoryTasks.every((t: { passed: boolean }) => t.passed);
      const allTestsPassed = passedTestCases === totalTestCases && totalTestCases > 0;
      const allTasksCompleted = completedTasks === totalTasks;

      let starCount = 0;

      // 1 звезда: все тесты пройдены, но ограничения не соблюдены
      if (allTestsPassed && !constraintsPassed) {
        starCount = 1;
      }

      // 2 звезды: все тесты пройдены, теория верна, но ограничения не соблюдены
      if (allTestsPassed && theoryPassed && !constraintsPassed) {
        starCount = 2;
      }

      // 3 звезды: все тесты пройдены, теория верна, ограничения соблюдены
      if (allTestsPassed && theoryPassed && constraintsPassed && allTasksCompleted) {
        starCount = 3;
      }

      // Запускаем анимацию звезд с задержкой
      setStars(0);
      setAnimatingStars([]);
      setShowStars(false);

      setTimeout(() => {
        setStars(starCount);
        
        const animateStars = async () => {
          setShowStars(true);

          for (let i = 0; i < starCount; i++) {
            setAnimatingStars((prev) => [...prev, i]);
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        };

        animateStars();
      }, 300);
    }
  }, [
    isOpen,
    results,
    completedTasks,
    totalTasks,
    totalTestCases,
    passedTestCases,
    constraintsPassed,
    slides,
  ]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.resultsModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Результаты урока</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.starsContainer}>
            {showStars &&
              [0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`${styles.starWrapper} ${
                    animatingStars.includes(index) ? styles.starFalling : ""
                  } ${index < stars ? styles.starVisible : styles.starHidden}`}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    left: `${30 + index * 20}%`,
                  }}
                >
                  <span className={`${styles.star} ${index < stars ? styles.starFilled : ""}`}>
                    ★
                  </span>
                </div>
              ))}
          </div>

          <div className={styles.resultsSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Выполнено заданий:</span>
              <span className={styles.summaryValue}>
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Пройдено тестов:</span>
              <span className={styles.summaryValue}>
                {passedTestCases}/{totalTestCases}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Ограничения:</span>
              <span className={styles.summaryValue}>{constraintsPassed ? "✅" : "❌"}</span>
            </div>
          </div>

          <div className={styles.resultsList}>
            <h4>Детали по заданиям:</h4>
            {results.map((result) => (
              <div
                key={result.slideId}
                className={`${styles.resultItem} ${result.passed ? styles.resultPassed : styles.resultFailed}`}
              >
                <div className={styles.resultTitle}>{result.title}</div>
                <div className={styles.resultDetails}>
                  <span>
                    Тесты: {result.testCasesPassed}/{result.testCasesTotal}
                  </span>
                  <span>Ограничения: {result.constraintsPassed ? "✅" : "❌"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <Button color="#9F0FA7" width="200px" textColor="#fff" text="Закрыть" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

export default function EditLesson() {
  const params = useParams();
  const lessonId = params?.id as string;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState<{ [slideId: string]: string | number }>({});
  const [testError, setTestError] = useState<{ [slideId: string]: string }>({});
  const [codeRunOutput, setCodeRunOutput] = useState<{ [blockId: string]: string }>({});
  const [codeRunLoading, setCodeRunLoading] = useState<{ [blockId: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetailsId, setLessonDetailsId] = useState<string | null>(null);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<{ url: string; note?: string }[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [testResults, setTestResults] = useState<{ [slideId: string]: any }>({});
  const testResultsRef = useRef<{ [slideId: string]: any }>({});

  const [lessonResults, setLessonResults] = useState<{
    results: any[];
    totalTasks: number;
    completedTasks: number;
    totalTestCases: number;
    passedTestCases: number;
    constraintsPassed: boolean;
  }>({
    results: [],
    totalTasks: 0,
    completedTasks: 0,
    totalTestCases: 0,
    passedTestCases: 0,
    constraintsPassed: true,
  });

  const isMovingBlock = useRef(false);

  useEffect(() => {
    if (lessonId) {
      loadLessonDetails();
    }
  }, [lessonId]);

  const loadLessonDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await LessonDetailsService.getLessonDetailsByLessonId(lessonId);
      setLessonDetailsId(data.id);

      const allSlides: Slide[] = [
        ...data.slides.map((slide) => ({
          id: slide.id,
          title: slide.title,
          type: slide.type as SlideType,
          order: slide.orderIndex,
          blocks: (slide.blocks || []) as unknown as SlideBlock[],
        })),
        ...data.tests.map((test) => ({
          id: test.id,
          title: test.title,
          type: "test" as const,
          order: test.orderIndex,
          blocks: (test.blocks || []) as unknown as SlideBlock[],
        })),
      ].sort((a, b) => a.order - b.order);

      setSlides(allSlides);
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log("Lesson details not found, starting with empty state");
        setSlides([]);
        setLessonDetailsId(null);
      } else {
        setError(err.message || "Ошибка загрузки урока");
        console.error("Error loading lesson details:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSlide = selectedSlideIndex !== null ? slides[selectedSlideIndex] : null;

  const addSlide = useCallback(
    (type: SlideType) => {
      const newSlide: Slide = {
        id: genId(),
        title: type === "lesson" ? "Новый слайд" : "Новый тест",
        type,
        order: slides.length,
        blocks: [],
      };

      setSlides((prev) => [...prev, newSlide]);
      setSelectedSlideIndex(slides.length);
    },
    [slides.length]
  );

  const updateSlide = useCallback((index: number, patch: Partial<Slide>) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const deleteSlide = useCallback(
    (index: number) => {
      setSlides((prev) => {
        const next = prev.filter((_, i) => i !== index);
        const reordered = next.map((slide, idx) => ({ ...slide, order: idx }));

        if (selectedSlideIndex === index) {
          setSelectedSlideIndex(null);
        } else if (selectedSlideIndex !== null && selectedSlideIndex > index) {
          setSelectedSlideIndex(selectedSlideIndex - 1);
        }

        return reordered;
      });
    },
    [selectedSlideIndex]
  );

  const addBlock = useCallback((slideIndex: number, kind: SlideBlock["type"]) => {
    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      const order = slide.blocks.length;
      let block: SlideBlock;

      switch (kind) {
        case "text":
          block = createTextBlock(order);
          break;
        case "codeExample":
          block = createCodeExampleBlock(order);
          break;
        case "source":
          block = createSourceBlock(order);
          break;
        case "table":
          block = createTableBlock(order);
          break;
        case "image":
          block = createImageBlock(order);
          break;
        case "codeTask":
          block = createCodeTaskBlock(order);
          break;
        case "theoryQuestion":
          block = createTheoryQuestionBlock(order);
          break;
        default:
          return prev;
      }

      next[slideIndex] = {
        ...next[slideIndex],
        blocks: [...next[slideIndex].blocks, block],
      };
      return next;
    });
  }, []);

  const updateBlock = useCallback(
    (slideIndex: number, blockId: string, patch: Partial<SlideBlock>) => {
      setSlides((prev) => {
        const next = [...prev];
        const slide = next[slideIndex];
        if (!slide) return prev;

        next[slideIndex] = {
          ...slide,
          blocks: slide.blocks.map((b) =>
            b.id === blockId ? { ...b, ...patch } : b
          ) as SlideBlock[],
        };
        return next;
      });
    },
    []
  );

  const deleteBlock = useCallback((slideIndex: number, blockId: string) => {
    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      const blocks = slide.blocks.filter((b) => b.id !== blockId);
      const reorderedBlocks = blocks.map((b, idx) => ({ ...b, order: idx })) as SlideBlock[];

      next[slideIndex] = { ...slide, blocks: reorderedBlocks };
      return next;
    });
  }, []);

  const moveBlock = useCallback((slideIndex: number, blockId: string, direction: "up" | "down") => {
    isMovingBlock.current = true;

    setSlides((prev) => {
      const next = [...prev];
      const slide = next[slideIndex];
      if (!slide) return prev;

      const sorted = sortBlocks(slide.blocks);
      const currentIndex = sorted.findIndex((b) => b.id === blockId);

      if (currentIndex === -1) return prev;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= sorted.length) return prev;

      const newBlocks = sorted.map((block, index) => {
        if (index === currentIndex) {
          return { ...block, order: newIndex };
        }
        if (index === newIndex) {
          return { ...block, order: currentIndex };
        }
        return { ...block };
      });

      const finalBlocks = sortBlocks(newBlocks);

      next[slideIndex] = { ...slide, blocks: finalBlocks };
      return next;
    });

    setTimeout(() => {
      isMovingBlock.current = false;
    }, 0);
  }, []);

  const handleImageUpload = useCallback(
    (slideIndex: number, blockId: string, file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(slideIndex, blockId, {
          url: reader.result as string,
          file: file,
        });
      };
      reader.readAsDataURL(file);
    },
    [updateBlock]
  );

  const runCode = useCallback(async (blockId: string, language: CodeLanguage, code: string) => {
    setCodeRunLoading((prev) => ({ ...prev, [blockId]: true }));
    setCodeRunOutput((prev) => ({ ...prev, [blockId]: "" }));
    try {
      const res = await CodeService.executeCode({ language, code });
      const text = res.error ? `Ошибка: ${res.error}` : res.output || "";
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: text }));
    } catch (error) {
      setCodeRunOutput((prev) => ({ ...prev, [blockId]: `Ошибка: ${error}` }));
    } finally {
      setCodeRunLoading((prev) => ({ ...prev, [blockId]: false }));
    }
  }, []);

  const openSourcesModal = useCallback((sources: { url: string; note?: string }[]) => {
    setCurrentSources(sources);
    setSourceModalOpen(true);
  }, []);

  const calculateResults = useCallback(() => {
    const testSlides = slides.filter((s) => s.type === "test");
    const results: any[] = [];
    let totalCompleted = 0;
    let totalTestCasesCount = 0;
    let passedTestCasesCount = 0;
    let allConstraintsPassed = true;

    const currentTestResults = testResultsRef.current;

    testSlides.forEach((slide) => {
      const slideAnswer = testAnswer[slide.id];
      const slideError = testError[slide.id];
      const slideTestResult = currentTestResults[slide.id];

      let slidePassed = false;
      let slideTestCasesPassed = 0;
      let slideTestCasesTotal = 0;
      let slideConstraintsPassed = true;

      const codeTasks = slide.blocks.filter((b) => b.type === "codeTask") as CodeTaskBlock[];
      const theoryQuestions = slide.blocks.filter(
        (b) => b.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      if (codeTasks.length > 0) {
        if (slideTestResult) {
          slideTestCasesPassed = slideTestResult.passedTests || 0;
          slideTestCasesTotal = slideTestResult.totalTests || 0;
          slideConstraintsPassed = slideTestResult.constraintsPassed || false;
          slidePassed = slideTestResult.allPassed || false;
        }
      } else if (theoryQuestions.length > 0) {
        const theoryPassed = theoryQuestions.every((q, index) => {
          const answer = testAnswer[slide.id];
          return typeof answer === "number" && answer === q.correctIndex;
        });
        slidePassed = theoryPassed;
        slideTestCasesTotal = theoryQuestions.length;
        slideTestCasesPassed = theoryPassed ? theoryQuestions.length : 0;
      }

      if (slidePassed) totalCompleted++;

      results.push({
        slideId: slide.id,
        title: slide.title,
        passed: slidePassed,
        testCasesPassed: slideTestCasesPassed,
        testCasesTotal: slideTestCasesTotal,
        constraintsPassed: slideConstraintsPassed,
      });

      totalTestCasesCount += slideTestCasesTotal;
      passedTestCasesCount += slideTestCasesPassed;
      allConstraintsPassed = allConstraintsPassed && slideConstraintsPassed;
    });

    setLessonResults({
      results,
      totalTasks: testSlides.length,
      completedTasks: totalCompleted,
      totalTestCases: totalTestCasesCount,
      passedTestCases: passedTestCasesCount,
      constraintsPassed: allConstraintsPassed,
    });

    setShowResultsModal(true);
  }, [slides, testAnswer, testError]);

  const handleLessonComplete = useCallback(() => {
    const testSlides = slides.filter((s) => s.type === "test");
    const currentTestResults = testResultsRef.current;
    
    let allTasksSolved = true;
    const unsolvedTasks: string[] = [];

    for (const slide of testSlides) {
      const slideTestResult = currentTestResults[slide.id];
      const codeTasks = slide.blocks.filter((b) => b.type === "codeTask") as CodeTaskBlock[];
      const theoryQuestions = slide.blocks.filter(
        (b) => b.type === "theoryQuestion"
      ) as TheoryQuestionBlock[];

      if (codeTasks.length > 0) {
        if (!slideTestResult || !slideTestResult.allPassed) {
          allTasksSolved = false;
          unsolvedTasks.push(slide.title);
        }
      } else if (theoryQuestions.length > 0) {
        const answer = testAnswer[slide.id];
        const theoryPassed = theoryQuestions.every((q) => typeof answer === "number" && answer === q.correctIndex);
        if (!theoryPassed) {
          allTasksSolved = false;
          unsolvedTasks.push(slide.title);
        }
      }
    }

    if (!allTasksSolved) {
      alert(`Не все задания выполнены!\n\nНе выполнены: ${unsolvedTasks.join(", ")}`);
      return;
    }

    calculateResults();
  }, [calculateResults, slides, testAnswer]);

  const saveLesson = useCallback(async () => {
    if (!lessonId) {
      setError("ID урока не найден");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const lessonSlidesData = slides
        .filter((s) => s.type === "lesson")
        .map((s) => ({
          title: s.title,
          type: "lesson" as const,
          orderIndex: s.order,
          blocks: s.blocks.map((block) => {
            if (block.type === "image") {
              const { file, ...rest } = block as any;
              return rest;
            }
            return block;
          }),
        }));

      const testSlidesData = slides
        .filter((s) => s.type === "test")
        .map((s) => ({
          title: s.title,
          orderIndex: s.order,
          blocks: s.blocks.map((block) => {
            if (block.type === "image") {
              const { file, ...rest } = block as any;
              return rest;
            }
            return block;
          }),
        }));

      if (lessonDetailsId) {
        await LessonDetailsService.updateLessonDetails(lessonDetailsId, {
          slides: lessonSlidesData,
          tests: testSlidesData,
        });
      } else {
        const response = await LessonDetailsService.createLessonDetails({
          lessonId,
          slides: lessonSlidesData,
          tests: testSlidesData,
        });
        setLessonDetailsId(response.id);
      }

      alert("Урок успешно сохранен!");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Ошибка сохранения урока");
    } finally {
      setIsSaving(false);
    }
  }, [slides, lessonId, lessonDetailsId]);

  if (isLoading) {
    return (
      <section className={styles.lesson}>
        <div className={styles.lesson__container}>
          <h1 className={styles.lesson__title}>Загрузка урока...</h1>
        </div>
      </section>
    );
  }

  if (previewMode) {
    const allSlides = slides.sort((a, b) => a.order - b.order);
    const currentSlide = allSlides[previewCurrentIndex];

    if (!currentSlide) {
      return (
        <section className={styles.lesson}>
          <div className={styles.lesson__container}>
            <h1 className={styles.lesson__title}>Превью урока</h1>
            <p>Нет слайдов.</p>
            <Button
              color="#9F0FA7"
              width="200px"
              textColor="#fff"
              text="Выйти из превью"
              onClick={() => setPreviewMode(false)}
            />
          </div>
        </section>
      );
    }

    const goNext = () => {
      if (previewCurrentIndex < allSlides.length - 1) {
        setPreviewCurrentIndex((i) => i + 1);
      } else {
        handleLessonComplete();
      }
    };

    const goPrev = () => {
      if (previewCurrentIndex > 0) {
        setPreviewCurrentIndex((i) => i - 1);
      }
    };

    const slideSources = currentSlide.blocks
      .filter((block): block is SourceBlock => block.type === "source")
      .map((block) => ({ url: block.url, note: block.note }));

    return (
      <section className={styles.lesson}>
        <div className={styles.lesson__container}>
          <div className={styles.previewTop}>
            <h1 className={styles.lesson__title}>Превью: {currentSlide.title}</h1>
            <div className={styles.previewTopActions}>
              {slideSources.length > 0 && (
                <Button
                  color="#9F0FA7"
                  width="40px"
                  textColor="#fff"
                  text="?"
                  onClick={() => openSourcesModal(slideSources)}
                />
              )}
              <Button
                color="#9F0FA7"
                width="200px"
                textColor="#fff"
                text="Выйти из превью"
                onClick={() => setPreviewMode(false)}
              />
            </div>
          </div>
          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              <h3 className={styles.preview__subtitle}>{currentSlide.title}</h3>
              {sortBlocks(currentSlide.blocks).map((block) => (
                <PreviewBlock
                  key={block.id}
                  block={block}
                  slideId={currentSlide.id}
                  runCode={runCode}
                  codeRunOutput={codeRunOutput[block.id]}
                  codeRunLoading={codeRunLoading[block.id]}
                  testAnswer={testAnswer[currentSlide.id]}
                  setTestAnswer={(v) =>
                    setTestAnswer((prev) => ({ ...prev, [currentSlide.id]: v }))
                  }
                  testError={testError[currentSlide.id]}
                  setTestError={(v) => setTestError((prev) => ({ ...prev, [currentSlide.id]: v }))}
                  onCorrect={goNext}
                  onResults={(results) => {
                    setTestResults((prev) => {
                      const newResults = { ...prev, [currentSlide.id]: results };
                      testResultsRef.current = newResults;
                      return newResults;
                    });
                  }}
                />
              ))}
            </div>
          </div>
          <div className={styles.previewNav}>
            <span>
              {previewCurrentIndex + 1} / {allSlides.length}
            </span>
            <Button
              color="#9F0FA7"
              width="120px"
              textColor="#fff"
              text="Назад"
              onClick={goPrev}
              disabled={previewCurrentIndex === 0}
            />
            <Button
              color="#9F0FA7"
              width="120px"
              textColor="#fff"
              text={previewCurrentIndex === allSlides.length - 1 ? "Завершить" : "Вперёд"}
              onClick={goNext}
            />
          </div>
        </div>
        <SourceModal
          isOpen={sourceModalOpen}
          onClose={() => setSourceModalOpen(false)}
          sources={currentSources}
        />
        <ResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setPreviewMode(false);
          }}
          results={lessonResults.results}
          totalTasks={lessonResults.totalTasks}
          completedTasks={lessonResults.completedTasks}
          totalTestCases={lessonResults.totalTestCases}
          passedTestCases={lessonResults.passedTestCases}
          constraintsPassed={lessonResults.constraintsPassed}
          slides={slides}
        />
      </section>
    );
  }

  return (
    <section className={styles.lesson}>
      <div className={styles.lesson__container}>
        <h1 className={styles.lesson__title}>Редактирование урока</h1>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className={styles.slideActions}>
          <Button
            color="#9F0FA7"
            width="180px"
            textColor="#fff"
            text="Слайд (урок)"
            onClick={() => addSlide("lesson")}
          />
          <Button
            color="#6a0f6e"
            width="180px"
            textColor="#fff"
            text="Слайд (тест)"
            onClick={() => addSlide("test")}
          />
        </div>

        {slides.length > 0 && (
          <div className={styles.slideTabs}>
            {slides.map((s, i) => (
              <div key={s.id} className={styles.slideTabWrapper}>
                <button
                  type="button"
                  className={selectedSlideIndex === i ? styles.slideTabActive : styles.slideTab}
                  onClick={() => setSelectedSlideIndex(i)}
                >
                  {s.type === "test" ? "Тест" : "Урок"} {i + 1}: {s.title || "—"}
                </button>
                <button
                  type="button"
                  className={styles.slideTabDelete}
                  onClick={() => deleteSlide(i)}
                  title="Удалить слайд"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedSlide !== null && selectedSlideIndex !== null && (
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.form__content}>
              <div className={styles.form__panel}>
                <label className={styles.form__label}>Название слайда</label>
                <input
                  className={styles.form__input}
                  value={selectedSlide.title}
                  onChange={(e) => updateSlide(selectedSlideIndex, { title: e.target.value })}
                  placeholder="Введите название"
                />
              </div>
              <div className={styles.form__panel}>
                <label className={styles.form__label}>Тип слайда</label>
                <select
                  value={selectedSlide.type}
                  onChange={(e) =>
                    updateSlide(selectedSlideIndex, { type: e.target.value as SlideType })
                  }
                >
                  <option value="lesson">Урок</option>
                  <option value="test">Тест</option>
                </select>
              </div>

              {selectedSlide.type === "lesson" && (
                <div className={styles.blockAddRow}>
                  <span className={styles.form__label}>Добавить блок:</span>
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Текст"
                    onClick={() => addBlock(selectedSlideIndex, "text")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Код (пример)"
                    onClick={() => addBlock(selectedSlideIndex, "codeExample")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Источник"
                    onClick={() => addBlock(selectedSlideIndex, "source")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Таблица"
                    onClick={() => addBlock(selectedSlideIndex, "table")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Изображение"
                    onClick={() => addBlock(selectedSlideIndex, "image")}
                  />
                </div>
              )}
              {selectedSlide.type === "test" && (
                <div className={styles.blockAddRow}>
                  <span className={styles.form__label}>Добавить блок:</span>
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Текст"
                    onClick={() => addBlock(selectedSlideIndex, "text")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Задача с кодом"
                    onClick={() => addBlock(selectedSlideIndex, "codeTask")}
                  />
                  <Button
                    color="#9F0FA7"
                    width="auto"
                    textColor="#fff"
                    text="Теор. вопрос"
                    onClick={() => addBlock(selectedSlideIndex, "theoryQuestion")}
                  />
                </div>
              )}

              <div className={styles.blocksList}>
                <label className={styles.form__label}>Блоки (порядок можно менять)</label>
                {sortBlocks(selectedSlide.blocks).map((block, idx) => (
                  <div key={block.id} className={styles.blockCard}>
                    <div className={styles.blockCard__toolbar}>
                      <span className={styles.blockCard__type}>{block.type}</span>
                      <button
                        type="button"
                        onClick={() => moveBlock(selectedSlideIndex, block.id, "up")}
                        disabled={idx === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(selectedSlideIndex, block.id, "down")}
                        disabled={idx === selectedSlide.blocks.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={styles.blockCard__del}
                        onClick={() => deleteBlock(selectedSlideIndex, block.id)}
                      >
                        Удалить
                      </button>
                    </div>
                    <BlockEditor
                      key={`${block.id}_${block.order}`}
                      block={block}
                      slideIndex={selectedSlideIndex}
                      updateBlock={updateBlock}
                      onImageUpload={handleImageUpload}
                      runCode={runCode}
                      codeRunOutput={codeRunOutput[block.id]}
                      codeRunLoading={codeRunLoading[block.id]}
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}

        <div className={styles.preview}>
          <h2 className={styles.preview__title}>Превью текущего слайда</h2>
          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              {slides.length === 0 ? (
                <p>Добавьте слайды</p>
              ) : selectedSlide ? (
                sortBlocks(selectedSlide.blocks ?? []).map((b) => (
                  <PreviewBlockStatic key={b.id} block={b} />
                ))
              ) : (
                <p>Выберите слайд для предпросмотра</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            color="#9F0FA7"
            width="200px"
            textColor="#fff"
            text="Открыть превью"
            onClick={() => {
              setPreviewCurrentIndex(0);
              setPreviewMode(true);
            }}
          />
          <Button
            color="#9F0FA7"
            width="200px"
            textColor="#fff"
            text={isSaving ? "Сохранение..." : "Сохранить изменения"}
            onClick={saveLesson}
            disabled={isSaving}
          />
        </div>
      </div>
    </section>
  );
}

function BlockEditor({
  block,
  slideIndex,
  updateBlock,
  onImageUpload,
  runCode,
  codeRunOutput,
  codeRunLoading,
}: {
  block: SlideBlock;
  slideIndex: number;
  updateBlock: (slideIndex: number, blockId: string, patch: Partial<SlideBlock>) => void;
  onImageUpload: (slideIndex: number, blockId: string, file: File) => void;
  runCode: (blockId: string, lang: CodeLanguage, code: string) => void;
  codeRunOutput: string | undefined;
  codeRunLoading: boolean | undefined;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (block.type === "text") {
    return (
      <textarea
        className={styles.form__textarea}
        value={block.content}
        onChange={(e) => updateBlock(slideIndex, block.id, { content: e.target.value })}
        placeholder="Текст"
      />
    );
  }

  if (block.type === "codeExample") {
    return (
      <div className={styles.blockEditor}>
        <select
          value={block.language}
          onChange={(e) =>
            updateBlock(slideIndex, block.id, { language: e.target.value as CodeLanguage })
          }
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={block.runnable ? "run" : "demo"}
          onChange={(e) =>
            updateBlock(slideIndex, block.id, { runnable: e.target.value === "run" })
          }
        >
          <option value="demo">Демо (не запускаемый)</option>
          <option value="run">Запускаемый</option>
        </select>
        <StableCodeEditor
          key={`${block.id}_code`}
          value={block.code}
          onChange={(v) => updateBlock(slideIndex, block.id, { code: v })}
          language={block.language}
          height={220}
          onRun={block.runnable ? () => runCode(block.id, block.language, block.code) : undefined}
          runLoading={block.runnable && !!codeRunLoading}
        />
        {block.runnable && codeRunOutput != null && (
          <pre className={styles.codeOutput}>{codeRunOutput}</pre>
        )}
      </div>
    );
  }

  if (block.type === "source") {
    return (
      <div className={styles.blockEditor}>
        <input
          className={styles.form__input}
          value={block.url}
          onChange={(e) => updateBlock(slideIndex, block.id, { url: e.target.value })}
          placeholder="Ссылка на источник"
        />
        <input
          className={styles.form__input}
          value={block.note ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { note: e.target.value || undefined })}
          placeholder="Примечание (описание источника)"
        />
      </div>
    );
  }

  if (block.type === "table") {
    const setCell = (r: number, c: number, v: string) => {
      const cells = block.cells.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? v : cell))
      );
      updateBlock(slideIndex, block.id, { cells });
    };
    const setSize = (rows: number, cols: number) => {
      const cells: string[][] = [];
      for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) cells[r][c] = block.cells[r]?.[c] ?? "";
      }
      updateBlock(slideIndex, block.id, { rows, cols, cells });
    };

    return (
      <div className={styles.blockEditor}>
        <div className={styles.tableControls}>
          <span>Строк:</span>
          <select value={block.rows} onChange={(e) => setSize(Number(e.target.value), block.cols)}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>Столбцов:</span>
          <select value={block.cols} onChange={(e) => setSize(block.rows, Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <tbody>
              {block.cells.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <input
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        className={styles.tableInput}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (block.type === "image") {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImageUpload(slideIndex, block.id, file);
      }
    };

    return (
      <div className={styles.blockEditor}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: "none" }}
        />
        <div className={styles.imageUploadControls}>
          <input
            className={styles.form__input}
            value={block.url}
            onChange={(e) => updateBlock(slideIndex, block.id, { url: e.target.value })}
            placeholder="URL изображения"
          />
          <Button
            color="#9F0FA7"
            width="auto"
            textColor="#fff"
            text="Загрузить с устройства"
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
        {block.url && (
          <div className={styles.imagePreview}>
            <img src={block.url} alt="Preview" className={styles.previewImg} />
          </div>
        )}
      </div>
    );
  }

  if (block.type === "codeTask") {
    const typedLanguages: CodeLanguage[] = ["java", "csharp", "golang", "cpp"];
    const isTypedLanguage = typedLanguages.includes(block.language);
    const isObjectOrientedLang = block.language === "java" || block.language === "csharp";
    const hasArgumentScheme = (block.argumentScheme?.length ?? 0) > 0;

    const addTestCase = () => {
      const testCases = [...(block.testCases ?? []), { input: "", expectedOutput: "", args: [] }];
      updateBlock(slideIndex, block.id, { testCases });
    };
    const updateTestCaseInput = (i: number, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[i]) testCases[i] = { input: "", expectedOutput: "", args: [] };
      testCases[i].input = value;
      updateBlock(slideIndex, block.id, { testCases });
    };
    const updateTestCaseExpected = (i: number, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[i]) testCases[i] = { input: "", expectedOutput: "", args: [] };
      testCases[i].expectedOutput = value;
      updateBlock(slideIndex, block.id, { testCases });
    };
    const updateTestCaseArgValue = (testCaseIndex: number, argIndex: number, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[testCaseIndex]) testCases[testCaseIndex] = { input: "", expectedOutput: "", args: [] };
      if (!testCases[testCaseIndex].args) testCases[testCaseIndex].args = [];
      
      if (!testCases[testCaseIndex].args![argIndex]) {
        testCases[testCaseIndex].args![argIndex] = { index: argIndex, value: "", objectValues: {} };
      }
      testCases[testCaseIndex].args![argIndex].value = value;
      updateBlock(slideIndex, block.id, { testCases });
    };
    const updateTestCaseArgObjectValue = (testCaseIndex: number, argIndex: number, fieldName: string, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[testCaseIndex]) testCases[testCaseIndex] = { input: "", expectedOutput: "", args: [] };
      if (!testCases[testCaseIndex].args) testCases[testCaseIndex].args = [];
      
      if (!testCases[testCaseIndex].args![argIndex]) {
        testCases[testCaseIndex].args![argIndex] = { index: argIndex, value: "", objectValues: {} };
      }
      if (!testCases[testCaseIndex].args![argIndex].objectValues) {
        testCases[testCaseIndex].args![argIndex].objectValues = {};
      }
      testCases[testCaseIndex].args![argIndex].objectValues![fieldName] = value;
      updateBlock(slideIndex, block.id, { testCases });
    };
    const deleteTestCase = (i: number) => {
      const testCases = [...(block.testCases ?? [])];
      testCases.splice(i, 1);
      updateBlock(slideIndex, block.id, { testCases });
    };
    const addConstraint = () => {
      const constraints = [
        ...(block.constraints ?? []),
        { type: "maxTimeMs" as CodeConstraintType, value: 1000 },
      ];
      updateBlock(slideIndex, block.id, { constraints });
    };
    const updateConstraint = (
      i: number,
      type: CodeConstraintType,
      value: number | string[] | boolean
    ) => {
      const constraints = [...(block.constraints ?? [])];
      if (!constraints[i]) constraints[i] = { type: "maxTimeMs", value: 1000 };
      constraints[i] = { type, value };
      updateBlock(slideIndex, block.id, { constraints });
    };
    const deleteConstraint = (i: number) => {
      const constraints = [...(block.constraints ?? [])];
      constraints.splice(i, 1);
      updateBlock(slideIndex, block.id, { constraints });
    };

    const updateArgSchemeType = (i: number, newType: ArgumentType) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (!scheme[i]) {
        scheme[i] = { name: `arg${i + 1}`, type: "int" };
      }
      scheme[i].type = newType;
      if (newType === "object") {
        scheme[i].objectFields = scheme[i].objectFields ?? [
          { name: "field1", type: "string", value: "" }
        ];
      } else {
        delete scheme[i].objectFields;
      }
      updateBlock(slideIndex, block.id, {
        argumentScheme: scheme,
        startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
      });
    };

    const updateArgSchemeName = (i: number, name: string) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (!scheme[i]) {
        scheme[i] = { name: `arg${i + 1}`, type: "int" };
      }
      scheme[i].name = name;
      updateBlock(slideIndex, block.id, {
        argumentScheme: scheme,
        startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
      });
    };

    const setArgSchemeCount = (count: number) => {
      const currentScheme = block.argumentScheme ?? [];
      let newScheme = [...currentScheme];
      
      // Дефолтный тип зависит от языка
      const defaultType: ArgumentType = isTypedLanguage ? "int" : "string";
      
      while (newScheme.length < count) {
        newScheme.push({ name: `arg${newScheme.length + 1}`, type: defaultType });
      }
      while (newScheme.length > count) {
        newScheme.pop();
      }
      
      updateBlock(slideIndex, block.id, {
        argumentScheme: newScheme,
        startCode: getDefaultStarterCode(block.language ?? "javascript", newScheme, block.returnType ?? "int"),
      });
    };

    const updateObjectFieldType = (argIndex: number, fieldIndex: number, fieldType: ArgumentType) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.objectFields?.[fieldIndex]) {
        scheme[argIndex].objectFields![fieldIndex].type = fieldType;
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
        });
      }
    };

    const addObjectFieldToScheme = (argIndex: number) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]) {
        if (!scheme[argIndex].objectFields) scheme[argIndex].objectFields = [];
        scheme[argIndex].objectFields!.push({ name: `field${scheme[argIndex].objectFields!.length + 1}`, type: "string", value: "" });
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
        });
      }
    };

    const deleteObjectFieldFromScheme = (argIndex: number, fieldIndex: number) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.objectFields) {
        scheme[argIndex].objectFields!.splice(fieldIndex, 1);
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
        });
      }
    };

    const updateArrayElementType = (argIndex: number, elementType: ArgumentType) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]) {
        scheme[argIndex].arrayElementType = elementType;
        if (elementType === "object") {
          scheme[argIndex].arrayElementObjectFields = scheme[argIndex].arrayElementObjectFields ?? [
            { name: "field1", type: "string", value: "" }
          ];
        } else {
          delete scheme[argIndex].arrayElementObjectFields;
        }
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
        });
      }
    };

    const addArrayElementObjectField = (argIndex: number) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.arrayElementObjectFields) {
        scheme[argIndex].arrayElementObjectFields!.push({ 
          name: `field${scheme[argIndex].arrayElementObjectFields!.length + 1}`, 
          type: "string", 
          value: "" 
        });
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
        });
      }
    };

    const updateArrayElementObjectField = (argIndex: number, fieldIndex: number, fieldName: string, fieldType: ArgumentType) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.arrayElementObjectFields?.[fieldIndex]) {
        scheme[argIndex].arrayElementObjectFields![fieldIndex].name = fieldName;
        scheme[argIndex].arrayElementObjectFields![fieldIndex].type = fieldType;
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: getDefaultStarterCode(block.language ?? "javascript", scheme, block.returnType ?? "int"),
        });
      }
    };

    const getTypeStringForLang = (type: ArgumentType): string => {
      return getTypeString(type, block.language ?? "javascript");
    };

    const formatValueForLanguage = (arg: ArgumentSchema, value: string): string => {
      if (!value.trim()) return "";
      
      const lang = block.language ?? "javascript";
      
      if (arg.type === "string") {
        return `"${value}"`;
      }
      if (arg.type === "char") {
        return `'${value}'`;
      }
      if (arg.type === "boolean") {
        return value.toLowerCase() === "true" ? "true" : "false";
      }
      if (arg.type === "object" && arg.objectFields) {
        const objValues = (block.testCases ?? []).flatMap(tc => tc.args ?? []).find(a => a.index === block.argumentScheme?.indexOf(arg))?.objectValues ?? {};
        const fields = arg.objectFields.map(f => {
          const val = objValues[f.name] ?? f.value ?? "";
          if (f.type === "string") {
            return `${f.name}: "${val}"`;
          } else if (f.type === "boolean") {
            return `${f.name}: ${val.toLowerCase() === "true" ? "true" : "false"}`;
          } else if (f.type === "double" || f.type === "float") {
            return `${f.name}: ${val}`;
          } else {
            return `${f.name}: ${val}`;
          }
        }).join(", ");
        
        if (lang === "java") {
          return `new ${arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1)}(${fields.replace(/,/g, ", ")})`;
        } else if (lang === "csharp") {
          const csharpFields = arg.objectFields.map(f => {
            const val = objValues[f.name] ?? f.value ?? "";
            if (f.type === "string") {
              return `${f.name} = "${val}"`;
            } else if (f.type === "boolean") {
              return `${f.name} = ${val.toLowerCase() === "true" ? "true" : "false"}`;
            } else if (f.type === "double" || f.type === "float") {
              return `${f.name} = ${val}`;
            } else {
              return `${f.name} = ${val}`;
            }
          }).join(", ");
          return `new ${arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1)} { ${csharpFields} }`;
        }
        // Для JS и Python объекты вводятся напрямую как {key: value}
        return value;
      }
      if (arg.type === "array" || arg.type === "list") {
        return value;
      }
      
      return value;
    };

    const generateInputString = (testCaseIndex: number): string => {
      const testCase = block.testCases?.[testCaseIndex];
      if (!testCase?.args || !block.argumentScheme) return testCase?.input ?? "";
      
      const args = testCase.args.map((arg, idx) => {
        const scheme = block.argumentScheme?.[idx];
        if (!scheme) return arg.value;
        
        if (hasArgumentScheme) {
          return formatValueForLanguage(scheme, arg.value);
        }
        return arg.value;
      }).filter(Boolean);
      
      return args.join(", ");
    };

    const typedArgumentTypes: { value: ArgumentType; label: string }[] = [
      { value: "int", label: "int (целое число)" },
      { value: "string", label: "string (строка)" },
      { value: "boolean", label: "boolean (логический)" },
      { value: "double", label: "double" },
      { value: "float", label: "float" },
      { value: "long", label: "long" },
      { value: "char", label: "char" },
      { value: "object", label: "object (объект)" },
      { value: "array_int", label: "int[] (массив int)" },
      { value: "array_string", label: "string[] (массив строк)" },
      { value: "array_double", label: "double[] (массив double)" },
      { value: "array_float", label: "float[] (массив float)" },
      { value: "array_long", label: "long[] (массив long)" },
      { value: "array_boolean", label: "boolean[] (массив boolean)" },
      { value: "array_char", label: "char[] (массив char)" },
      { value: "list", label: "list (список)" },
    ];

    const untypedArgumentTypes: { value: ArgumentType; label: string }[] = [
      { value: "string", label: "string (строка)" },
      { value: "number", label: "number (число)" },
      { value: "boolean", label: "boolean (логический)" },
      { value: "object", label: "object (объект)" },
      { value: "array", label: "array (массив)" },
    ];

    const argumentTypes = isTypedLanguage ? typedArgumentTypes : untypedArgumentTypes;

    const primitiveTypes: { value: ArgumentType; label: string }[] = [
      { value: "int", label: "int" },
      { value: "string", label: "string" },
      { value: "boolean", label: "boolean" },
      { value: "double", label: "double" },
      { value: "float", label: "float" },
    ];

    const typedReturnTypes: { value: ArgumentType; label: string }[] = [
      { value: "int", label: "int" },
      { value: "string", label: "string" },
      { value: "boolean", label: "boolean" },
      { value: "double", label: "double" },
      { value: "float", label: "float" },
      { value: "long", label: "long" },
      { value: "object", label: "Object" },
      { value: "array_int", label: "int[]" },
      { value: "array_string", label: "string[]" },
      { value: "array_double", label: "double[]" },
      { value: "array_float", label: "float[]" },
      { value: "array_long", label: "long[]" },
      { value: "array_boolean", label: "boolean[]" },
      { value: "array_char", label: "char[]" },
      { value: "list", label: "List" },
      { value: "void", label: "void (ничего)" },
    ];

    const untypedReturnTypes: { value: ArgumentType; label: string }[] = [
      { value: "string", label: "string" },
      { value: "boolean", label: "boolean" },
      { value: "object", label: "Object" },
      { value: "array", label: "array" },
      { value: "list", label: "list" },
      { value: "void", label: "void (ничего)" },
    ];

    const returnTypes = isTypedLanguage ? typedReturnTypes : untypedReturnTypes;

    const currentArgCount = block.argumentScheme?.length ?? 0;

    return (
      <div className={styles.blockEditor}>
        <label>Описание задачи</label>
        <textarea
          className={styles.form__textarea}
          value={block.description ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { description: e.target.value })}
          placeholder="Например: Реализуйте функцию, которая возвращает n-ое число Фибоначчи"
          rows={3}
        />
        <div className={styles.form__wrapper}>
          <span>Язык программирования:</span>
          <select
            value={block.language ?? "javascript"}
            onChange={(e) => {
              const newLang = e.target.value as CodeLanguage;
              updateBlock(slideIndex, block.id, {
                language: newLang,
                startCode: getDefaultStarterCode(newLang, block.argumentScheme ?? [], block.returnType ?? "int"),
              });
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.form__wrapper}>
          <span>Тип:</span>
          <select
            value={block.runnable ? "run" : "output"}
            onChange={(e) =>
              updateBlock(slideIndex, block.id, { runnable: e.target.value === "run" })
            }
          >
            <option value="run">С запуском (стартовый код + тест-кейсы)</option>
            <option value="output">Без запуска (задача на вывод)</option>
          </select>
        </div>
        {block.runnable ? (
          <>
            {isTypedLanguage && (
              <div className={styles.form__wrapper}>
                <span>Тип возвращаемого значения:</span>
                <select
                  value={block.returnType ?? "int"}
                  onChange={(e) => {
                    const newReturnType = e.target.value as ArgumentType;
                    updateBlock(slideIndex, block.id, {
                      returnType: newReturnType,
                      startCode: getDefaultStarterCode(block.language ?? "javascript", block.argumentScheme ?? [], newReturnType),
                    });
                  }}
                >
                  {returnTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>Схема аргументов</h4>
              </div>
              <div className={styles.form__wrapper}>
                <span>Количество аргументов:</span>
                <select
                  value={currentArgCount}
                  onChange={(e) => setArgSchemeCount(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              {(block.argumentScheme ?? []).map((arg, i) => (
                <div key={i} className={styles.argumentRow}>
                  <div className={styles.argumentHeader}>
                    <span>Аргумент #{i + 1}</span>
                  </div>
                  <div className={styles.argumentContent}>
                    <input
                      value={arg.name}
                      onChange={(e) => updateArgSchemeName(i, e.target.value)}
                      placeholder="Имя переменной"
                      className={styles.argumentName}
                    />
                    <select
                      value={arg.type}
                      onChange={(e) => updateArgSchemeType(i, e.target.value as ArgumentType)}
                      className={styles.argumentType}
                    >
                      {argumentTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                      {arg.type === "object" && isTypedLanguage && (
                    <div className={styles.objectFields}>
                      <div className={styles.objectFieldsHeader}>
                        <span>Имя класса:</span>
                        <input
                          value={arg.className ?? ""}
                          onChange={(e) => {
                            const scheme = [...(block.argumentScheme ?? [])];
                            if (scheme[i]) {
                              scheme[i].className = e.target.value;
                              const newStartCode = getDefaultStarterCode(
                                block.language ?? "javascript",
                                scheme,
                                block.returnType ?? "int"
                              );
                              updateBlock(slideIndex, block.id, { 
                                argumentScheme: scheme,
                                startCode: newStartCode
                              });
                            }
                          }}
                          placeholder="Person"
                          style={{ marginLeft: "8px", width: "120px" }}
                        />
                      </div>
                      <div className={styles.objectFieldsHeader} style={{ marginTop: "8px" }}>
                        <span>Поля объекта:</span>
                        <Button
                          color="#6a0f6e"
                          width="auto"
                          textColor="#fff"
                          text="+ Добавить поле"
                          onClick={() => addObjectFieldToScheme(i)}
                        />
                      </div>
                      {(arg.objectFields ?? []).map((field, fieldIdx) => (
                        <div key={fieldIdx} className={styles.objectFieldRow}>
                          <input
                            value={field.name}
                            onChange={(e) => {
                              const scheme = [...(block.argumentScheme ?? [])];
                              if (scheme[i]?.objectFields?.[fieldIdx]) {
                                scheme[i].objectFields![fieldIdx].name = e.target.value;
                                updateBlock(slideIndex, block.id, { argumentScheme: scheme });
                              }
                            }}
                            placeholder="Имя поля"
                            style={{marginRight: "8px", width: "100px" }}
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateObjectFieldType(i, fieldIdx, e.target.value as ArgumentType)}
                            className={styles.objectFieldType}
                          >
                            {primitiveTypes.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <button className={styles.deleteButton} onClick={() => deleteObjectFieldFromScheme(i, fieldIdx)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(arg.type === "array" || arg.type === "list") && (
                    <div className={styles.objectFields}>
                      <div className={styles.objectFieldsHeader}>
                        <span>Тип элементов массива:</span>
                        <select
                          value={arg.arrayElementType ?? "int"}
                          onChange={(e) => updateArrayElementType(i, e.target.value as ArgumentType)}
                          className={styles.objectFieldType}
                          style={{ marginLeft: "8px" }}
                        >
                          {isTypedLanguage ? (
                            <>
                              <option value="int">int</option>
                              <option value="string">string</option>
                              <option value="boolean">boolean</option>
                              <option value="double">double</option>
                              <option value="float">float</option>
                              <option value="object">object (свой объект класс)</option>
                            </>
                          ) : (
                            <>
                              <option value="string">string</option>
                              <option value="boolean">boolean</option>
                              <option value="object">object</option>
                            </>
                          )}
                        </select>
                      </div>
                      {arg.arrayElementType === "object" && (
                        <div className={styles.arrayElementFields}>
                          <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                            <span>Имя класса элемента:</span>
                            <input
                              value={arg.arrayElementClassName ?? ""}
                              onChange={(e) => {
                                const scheme = [...(block.argumentScheme ?? [])];
                                if (scheme[i]) {
                                  scheme[i].arrayElementClassName = e.target.value;
                                  const newStartCode = getDefaultStarterCode(
                                    block.language ?? "javascript",
                                    scheme,
                                    block.returnType ?? "int"
                                  );
                                  updateBlock(slideIndex, block.id, { 
                                    argumentScheme: scheme,
                                    startCode: newStartCode
                                  });
                                }
                              }}
                              placeholder="Person"
                              style={{ marginLeft: "8px", width: "120px" }}
                            />
                          </div>
                          <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                            <span>Поля элемента объекта:</span>
                            <Button
                              color="#6a0f6e"
                              width="auto"
                              textColor="#fff"
                              text="+ Добавить поле"
                              onClick={() => addArrayElementObjectField(i)}
                            />
                          </div>
                          {(arg.arrayElementObjectFields ?? []).map((field, fieldIdx) => (
                            <div key={fieldIdx} className={styles.objectFieldRow} style={{ marginTop: "4px" }}>
                              <input
                                value={field.name}
                                onChange={(e) => updateArrayElementObjectField(i, fieldIdx, e.target.value, field.type)}
                                placeholder="Имя поля"
                                className={styles.objectFieldName}
                                style={{ marginRight: "4px" }}
                              />
                              <select
                                value={field.type}
                                onChange={(e) => updateArrayElementObjectField(i, fieldIdx, field.name, e.target.value as ArgumentType)}
                                className={styles.objectFieldType}
                              >
                                {primitiveTypes.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                              <button className={styles.deleteButton} onClick={() => {
                                const scheme = [...(block.argumentScheme ?? [])];
                                if (scheme[i]?.arrayElementObjectFields) {
                                  scheme[i].arrayElementObjectFields!.splice(fieldIdx, 1);
                                  updateBlock(slideIndex, block.id, { argumentScheme: scheme });
                                }
                              }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <label>
              Стартовый код
              {(block.language === "csharp" || block.language === "java") && (
                <span style={{ fontSize: "0.9em", color: "#666", marginLeft: "10px" }}>
                  (Для {block.language === "csharp" ? "C#" : "Java"} код автоматически оборачивается
                  в main метод при выполнении)
                </span>
              )}
            </label>
            <StableCodeEditor
              key={`${block.id}_startcode`}
              value={stripMainMethod(block.startCode ?? "", block.language ?? "javascript")}
              onChange={(v) => updateBlock(slideIndex, block.id, { startCode: v })}
              language={block.language ?? "javascript"}
              height={220}
            />

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>Тест-кейсы</h4>
                <Button
                  color="#9F0FA7"
                  width="auto"
                  textColor="#fff"
                  text="+ Добавить тест-кейс"
                  onClick={addTestCase}
                />
              </div>
              {(block.testCases ?? []).map((tc, i) => (
                <div key={i} className={styles.testCase}>
                  <div className={styles.testCaseHeader}>
                    <span className={styles.testCaseTitle}>Тест #{i + 1}</span>
                    <button className={styles.deleteButton} onClick={() => deleteTestCase(i)}>
                      ✕
                    </button>
                  </div>
                  
                  {hasArgumentScheme ? (
                    <div className={styles.testCaseArgs}>
                      <span style={{fontWeight: "bold", marginBottom: "8px", display: "block"}}>Значения аргументов:</span>
                      {(block.argumentScheme ?? []).map((arg, argIdx) => (
                        <div key={argIdx} className={styles.testCaseArgRow}>
                          <span style={{minWidth: "80px"}}>{arg.name}{isTypedLanguage && ` (${getTypeStringForLang(arg.type)})`}:</span>
                          
                          {arg.type === "object" && arg.objectFields && isTypedLanguage ? (
                            <div className={styles.testCaseObjectFields}>
                              {arg.objectFields.map((field, fieldIdx) => (
                                <div key={fieldIdx} className={styles.testCaseObjectFieldRow}>
                                  <span style={{marginRight: "4px"}}>{field.name}:</span>
                                  <input
                                    value={tc.args?.[argIdx]?.objectValues?.[field.name] ?? ""}
                                    onChange={(e) => updateTestCaseArgObjectValue(i, argIdx, field.name, e.target.value)}
                                    placeholder={`значение ${isTypedLanguage ? field.type : ''}`}
                                    className={styles.objectFieldValue}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <input
                              value={tc.args?.[argIdx]?.value ?? ""}
                              onChange={(e) => updateTestCaseArgValue(i, argIdx, e.target.value)}
                              placeholder={arg.type === "object" ? "{key: value}" : (isTypedLanguage ? arg.type : "")}
                              className={styles.argumentValue}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.simpleArgsInput}>
                      <span style={{fontWeight: "bold", marginBottom: "4px", display: "block"}}>Входные данные:</span>
                      <input
                        value={tc.input ?? ""}
                        onChange={(e) => updateTestCaseInput(i, e.target.value)}
                        placeholder="1, 'test', [1,2,3], true"
                      />
                    </div>
                  )}
                  
                  <input
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestCaseExpected(i, e.target.value)}
                    placeholder="Ожидаемый возврат"
                  />
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>Ограничения</h4>
                <Button
                  color="#FFA500"
                  width="auto"
                  textColor="#fff"
                  text="+ Добавить ограничение"
                  onClick={addConstraint}
                />
              </div>
              {(block.constraints ?? []).map((c, i) => (
                <div key={i} className={styles.constraint}>
                  <div className={styles.constraintHeader}>
                    <span className={styles.constraintTitle}>
                      {c.type === "maxTimeMs" && "⏱ Ограничение по времени"}
                      {c.type === "maxLines" && "📏 Ограничение по строкам"}
                      {c.type === "forbiddenTokens" && "🚫 Запрещённые слова"}
                      {c.type === "noComments" && "💬 Без комментариев"}
                      {c.type === "noConsoleLog" && "📢 Без console.log"}
                      {c.type === "maxComplexity" && "🔄 Цикломатическая сложность"}
                      {c.type === "memoryLimit" && "💾 Ограничение по памяти"}
                      {c.type === "requiredKeywords" && "🔑 Обязательные ключевые слова"}
                    </span>
                    <button className={styles.deleteButton} onClick={() => deleteConstraint(i)}>
                      ✕
                    </button>
                  </div>
                  <div className={styles.constraintContent}>
                    <select
                      value={c.type}
                      onChange={(e) => {
                        const newType = e.target.value as CodeConstraintType;
                        let defaultValue: any = 1000;
                        if (newType === "maxLines") defaultValue = 30;
                        if (newType === "forbiddenTokens") defaultValue = [];
                        if (newType === "noComments") defaultValue = true;
                        if (newType === "noConsoleLog") defaultValue = true;
                        if (newType === "maxComplexity") defaultValue = 5;
                        if (newType === "memoryLimit") defaultValue = 256;
                        if (newType === "requiredKeywords") defaultValue = [];
                        updateConstraint(i, newType, defaultValue);
                      }}
                    >
                      <option value="maxTimeMs">⏱ Время выполнения (мс)</option>
                      <option value="maxLines">📏 Максимум строк кода</option>
                      <option value="forbiddenTokens">🚫 Запрещённые слова</option>
                      <option value="noComments">💬 Без комментариев</option>
                      <option value="noConsoleLog">📢 Без console.log</option>
                      <option value="maxComplexity">🔄 Макс. цикломатическая сложность</option>
                      <option value="memoryLimit">💾 Ограничение по памяти (МБ)</option>
                      <option value="requiredKeywords">🔑 Обязательные ключевые слова</option>
                    </select>

                    {c.type === "maxTimeMs" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 1000}
                        onChange={(e) => updateConstraint(i, "maxTimeMs", Number(e.target.value))}
                        min="1"
                        max="10000"
                      />
                    )}

                    {c.type === "maxLines" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 30}
                        onChange={(e) => updateConstraint(i, "maxLines", Number(e.target.value))}
                        min="1"
                        max="500"
                      />
                    )}

                    {c.type === "forbiddenTokens" && (
                      <input
                        value={Array.isArray(c.value) ? (c.value as string[]).join(", ") : ""}
                        onChange={(e) =>
                          updateConstraint(
                            i,
                            "forbiddenTokens",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="for, while, sort, reverse"
                      />
                    )}

                    {c.type === "noComments" && (
                      <div className={styles.checkboxWrapper}>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.value === true}
                            onChange={(e) => updateConstraint(i, "noComments", e.target.checked)}
                          />
                          Запретить комментарии
                        </label>
                      </div>
                    )}

                    {c.type === "noConsoleLog" && (
                      <div className={styles.checkboxWrapper}>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.value === true}
                            onChange={(e) => updateConstraint(i, "noConsoleLog", e.target.checked)}
                          />
                          Запретить console.log
                        </label>
                      </div>
                    )}

                    {c.type === "maxComplexity" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 5}
                        onChange={(e) =>
                          updateConstraint(i, "maxComplexity", Number(e.target.value))
                        }
                        min="1"
                        max="20"
                      />
                    )}

                    {c.type === "memoryLimit" && (
                      <input
                        type="number"
                        value={typeof c.value === "number" ? c.value : 256}
                        onChange={(e) => updateConstraint(i, "memoryLimit", Number(e.target.value))}
                        min="16"
                        max="1024"
                      />
                    )}

                    {c.type === "requiredKeywords" && (
                      <input
                        value={Array.isArray(c.value) ? (c.value as string[]).join(", ") : ""}
                        onChange={(e) =>
                          updateConstraint(
                            i,
                            "requiredKeywords",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="function, return, const"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <label>Ожидаемый вывод (задача на вывод)</label>
            <input
              className={styles.form__input}
              value={block.expectedOutput ?? ""}
              onChange={(e) =>
                updateBlock(slideIndex, block.id, { expectedOutput: e.target.value })
              }
              placeholder="Ожидаемый вывод"
            />
            <label>Код для ввода (в превью пользователь вводит код)</label>
            <textarea
              className={styles.form__textarea}
              placeholder="В превью: поле ввода кода"
              rows={2}
              readOnly
            />
          </>
        )}
      </div>
    );
  }

  if (block.type === "theoryQuestion") {
    const addOption = () => updateBlock(slideIndex, block.id, { options: [...block.options, ""] });
    const setOption = (i: number, v: string) => {
      const options = [...block.options];
      options[i] = v;
      updateBlock(slideIndex, block.id, { options });
    };
    const deleteOption = (i: number) => {
      const options = [...block.options];
      options.splice(i, 1);
      if (block.correctIndex === i) {
        updateBlock(slideIndex, block.id, { options, correctIndex: 0 });
      } else if (block.correctIndex > i) {
        updateBlock(slideIndex, block.id, { options, correctIndex: block.correctIndex - 1 });
      } else {
        updateBlock(slideIndex, block.id, { options });
      }
    };

    return (
      <div className={styles.blockEditor}>
        <input
          className={styles.form__input}
          value={block.text ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { text: e.target.value })}
          placeholder="Текст вопроса"
        />
        <StableCodeEditor
          key={`${block.id}_code`}
          value={block.code ?? ""}
          onChange={(v) => updateBlock(slideIndex, block.id, { code: v })}
          language="javascript"
          height={120}
        />
        <input
          className={styles.form__input}
          value={block.imageUrl ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { imageUrl: e.target.value })}
          placeholder="URL изображения"
        />

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Варианты ответа</h4>
            <Button
              color="#9F0FA7"
              width="auto"
              textColor="#fff"
              text="+ Добавить вариант"
              onClick={addOption}
            />
          </div>
          {block.options.map((opt, i) => (
            <div key={i} className={styles.option}>
              <div className={styles.optionHeader}>
                <span className={styles.optionTitle}>Вариант {i + 1}</span>
                <button className={styles.deleteButton} onClick={() => deleteOption(i)}>
                  ✕
                </button>
              </div>
              <div className={styles.optionContent}>
                <input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Вариант ${i + 1}`}
                  className={styles.form__input}
                />
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={`correct_${block.id}`}
                    checked={block.correctIndex === i}
                    onChange={() => updateBlock(slideIndex, block.id, { correctIndex: i })}
                  />
                  Правильный ответ
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function PreviewBlockStatic({ block }: { block: SlideBlock }) {
  if (block.type === "text") return <p>{block.content || "(пусто)"}</p>;

  if (block.type === "codeExample")
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

  if (block.type === "image")
    return block.url ? (
      <img src={block.url} alt="" className={styles.previewImg} />
    ) : (
      <p>(изображение)</p>
    );

  if (block.type === "codeTask") return <p>Задача: {block.description || "—"}</p>;

  if (block.type === "theoryQuestion") return <p>Вопрос: {block.text || "—"}</p>;

  return null;
}

// Функция для преобразования аргументов тест-кейса в строку для Java/C#
const formatArgsForJavaOrCSharp = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: CodeLanguage
): string => {
  if (!testCaseArgs || !argumentScheme) return "";
  
  const cleanValue = (val: string) => {
    // Убираем кавычки если они есть
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
        // Для C# используем конструктор вместо object initializer для поддержки private полей
        const className = scheme.className || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
        return `new ${className}(${fields.join(", ")})`;
      }
      return `{${fields.join(", ")}}`;
    }
    // Handle typed arrays (array_int, array_string, etc.)
    if (scheme.type && scheme.type.startsWith("array_")) {
      const elementType = scheme.type.replace("array_", "");
      const typeToUse = elementType === "string" ? "String" : elementType;
      
      // Parse JSON array from value
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
        } catch {
          // Not valid JSON
        }
      }
      // For object values in test cases
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
          const fields = objFields.map(f => {
            const fieldVal = cleanValue((val as unknown as Record<string, string>)?.[f.name] ?? "");
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
          // Для C# используем конструктор
          const csharpFields = objFields.map(f => {
            const fieldVal = cleanValue((val as unknown as Record<string, string>)?.[f.name] ?? "");
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
      
      // Handle primitive arrays
      if (arg.value && arg.value.trim().startsWith("[")) {
        // If it's already a JSON array, parse and format it
        try {
          const arr = JSON.parse(arg.value);
          if (Array.isArray(arr)) {
            const formatted = arr.map(item => {
              if (arrayElementType === "string") return `"${item}"`;
              if (arrayElementType === "boolean") return item ? "true" : "false";
              return String(item);
            });
            return `new ${getTypeString(arrayElementType, language)}[] { ${formatted.join(", ")} }`;
          }
        } catch {
          // Not valid JSON, fall through
        }
      }
      
      // For simple values or if parsing failed, use default array
      return arg.value;
    }
    
    // Handle object type without fields - convert JSON to Map
    if (scheme.type === "object" && !scheme.objectFields) {
      if (arg.value && arg.value.trim().startsWith("{")) {
        try {
          const obj = JSON.parse(arg.value);
          if (typeof obj === "object" && obj !== null) {
            if (language === "java") {
              const entries = Object.entries(obj).map(([k, v]) => {
                const val = typeof v === "string" ? `"${v}"` : String(v);
                return `"${k}", ${val}`;
              }).join(", ");
              return `new java.util.HashMap<>() {{ put(${entries}); }}`;
            }
          }
        } catch {
          // Not valid JSON, fall through
        }
      }
    }
    
    // Handle map type
    if (scheme.type === "map") {
      if (arg.value && arg.value.trim().startsWith("{")) {
        try {
          const obj = JSON.parse(arg.value);
          if (typeof obj === "object" && obj !== null) {
            if (language === "java") {
              const entries = Object.entries(obj).map(([k, v]) => {
                const val = typeof v === "string" ? `"${v}"` : String(v);
                return `"${k}", ${val}`;
              }).join(", ");
              return `new java.util.HashMap<>() {{ put(${entries}); }}`;
            }
          }
        } catch {
          // Not valid JSON
        }
      }
    }
    
    return arg.value;
  }).filter(Boolean);
  
  return args.join(", ");
};

// Функция для преобразования аргументов тест-кейса в строку для JavaScript/Python
const formatArgsForDynamicLang = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: CodeLanguage
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
    if (scheme.type === "number") {
      return cleanVal;
    }
    if (scheme.type === "char") {
      return `'${cleanVal}'`;
    }
    if (scheme.type === "boolean") {
      if (language === "python") {
        return cleanVal.toLowerCase() === "true" ? "True" : "False";
      }
      return cleanVal.toLowerCase() === "true" ? "true" : "false";
    }
    if (scheme.type === "object") {
      // Для JS и Python объекты вводятся напрямую как {key: value} или {"key": value}
      return arg.value || "{}";
    }
    // Handle typed arrays (array_int, array_string, etc.)
    if (scheme.type && scheme.type.startsWith("array_")) {
      const elementType = scheme.type.replace("array_", "");
      
      if (arg.value && arg.value.trim().startsWith("[")) {
        try {
          const arr = JSON.parse(arg.value);
          if (Array.isArray(arr)) {
            const formatted = arr.map((item: any) => {
              if (elementType === "string") return `"${item}"`;
              if (elementType === "boolean") {
                if (language === "python") return item ? "True" : "False";
                return item ? "true" : "false";
              }
              return String(item);
            });
            return `[${formatted.join(", ")}]`;
          }
        } catch {
          // Not valid JSON
        }
      }
      return arg.value;
    }
    if (scheme.type === "array" || scheme.type === "list") {
      const arrayElementType = scheme.arrayElementType ?? "int";
      if (scheme.arrayElementObjectFields) {
        const arrayObjValues = arg.objectValues ?? {};
        const className = scheme.arrayElementClassName || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
        const elements = Object.entries(arrayObjValues).map(([key, val]) => {
          const objFields = scheme.arrayElementObjectFields!;
          const fields = objFields.map(f => {
            const fieldVal = cleanValue((val as unknown as Record<string, string>)?.[f.name] ?? "");
            if (f.type === "string") {
              return `${f.name}: "${fieldVal}"`;
            } else if (f.type === "boolean") {
              if (language === "python") {
                return `${f.name}=${fieldVal.toLowerCase() === "true" ? "True" : "False"}`;
              }
              return `${f.name}: ${fieldVal.toLowerCase() === "true" ? "true" : "false"}`;
            } else if (f.type === "double" || f.type === "float") {
              return `${f.name}: ${fieldVal}`;
            } else if (f.type === "char") {
              return `${f.name}: '${fieldVal}'`;
            } else {
              return `${f.name}: ${fieldVal}`;
            }
          });
          
          if (language === "javascript") {
            return `new ${className}({ ${fields.join(", ")} })`;
          } else if (language === "python") {
            const pyFields = objFields.map(f => {
              const fieldVal = cleanValue((val as unknown as Record<string, string>)?.[f.name] ?? "");
              if (f.type === "string") {
                return `${f.name}="${fieldVal}"`;
              } else if (f.type === "boolean") {
                return `${f.name}=${fieldVal.toLowerCase() === "true" ? "True" : "False"}`;
              } else {
                return `${f.name}=${fieldVal}`;
              }
            });
            return `${className}(${pyFields.join(", ")})`;
          }
          return arg.value;
        });
        return `[${elements.join(", ")}]`;
      }
      
      if (arg.value && arg.value.trim().startsWith("[")) {
        try {
          const arr = JSON.parse(arg.value);
          if (Array.isArray(arr)) {
            const formatted = arr.map(item => {
              if (arrayElementType === "string") return `"${item}"`;
              if (arrayElementType === "boolean") {
                if (language === "python") return item ? "True" : "False";
                return item ? "true" : "false";
              }
              return String(item);
            });
            return `[${formatted.join(", ")}]`;
          }
        } catch {
          // Not valid JSON
        }
      }
      return arg.value;
    }
    
    return arg.value;
  }).filter(Boolean);
  
  return args.join(", ");
};

// Функция для получения входных данных для отображения
const getDisplayInput = (
  testCase: { input?: string; args?: TestCaseArgument[] } | undefined,
  argumentScheme: ArgumentSchema[] | undefined,
  language: CodeLanguage | undefined
): string => {
  if (!testCase) return "";
  
  // Если есть args и это Java/C#/JS/Python, используем форматированный вывод
  if (testCase.args && testCase.args.length > 0 && argumentScheme && argumentScheme.length > 0) {
    if (language === "java" || language === "csharp") {
      return formatArgsForJavaOrCSharp(testCase.args, argumentScheme, language);
    }
    if (language === "javascript" || language === "python") {
      return formatArgsForDynamicLang(testCase.args, argumentScheme, language);
    }
  }
  
  // Иначе возвращаем input как есть
  return testCase.input ?? "";
};

const generateObjectClassesForPreview = (args: ArgumentSchema[], language: CodeLanguage): string => {
  const objectArgs = args.filter((a) => a.type === "object" && a.objectFields);
  if (objectArgs.length === 0) return "";

  return objectArgs
    .map((arg) => {
      const className = arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      const objectFields = arg.objectFields ?? [];

      if (language === "java") {
        const fields = objectFields
          ?.map((f) => `    private ${getTypeString(f.type, language)} ${f.name};`)
          .join("\n");
        const constructorParams = objectFields.map(f => `${getTypeString(f.type, language)} ${f.name}`).join(", ");
        const constructorBody = objectFields.map(f => `this.${f.name} = ${f.name};`).join("\n        ");
        const constructor = objectFields.length > 0 ? `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }` : "";
        const gettersSetters = objectFields
          ?.map((f) => {
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
        return `class ${className} {
${fields}
${constructor}
${gettersSetters}
}`;
      }
      if (language === "csharp") {
        const fields = objectFields
          ?.map((f) => `    private ${getTypeString(f.type, language)} ${f.name};`)
          .join("\n");
        const constructorParams = objectFields.map(f => `${getTypeString(f.type, language)} ${f.name}`).join(", ");
        const constructorBody = objectFields.map(f => `this.${f.name} = ${f.name};`).join("\n        ");
        const constructor = objectFields.length > 0 ? `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }` : "";
        const gettersSetters = objectFields
          ?.map((f) => {
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
${fields}
${constructor}
${gettersSetters}
}`;
      }
      if (language === "javascript" || language === "python") {
        if (language === "javascript") {
          const constructorParams = objectFields.map(f => f.name).join(", ");
          const constructorBody = objectFields.map(f => `this.${f.name} = ${f.name};`).join("\n    ");
          const constructor = objectFields.length > 0 ? `
class ${className} {
    constructor(${constructorParams}) {
        ${constructorBody}
    }
}` : `
class ${className} {
}`;
          return constructor;
        } else {
          const constructorParams = objectFields.map(f => f.name).join(", ");
          const constructorBody = objectFields.map(f => `self.${f.name} = ${f.name}`).join("\n        ");
          const constructor = objectFields.length > 0 ? `
class ${className}:
    def __init__(self, ${constructorParams}):
        ${constructorBody}` : `
class ${className}:
    pass`;
          return constructor;
        }
      }
      return "";
    })
    .join("\n\n");
};

const getArrayTypeString = (scheme: ArgumentSchema, language: CodeLanguage): string => {
  const elementType = scheme.arrayElementType ?? "int";
  
  if (scheme.arrayElementObjectFields && scheme.arrayElementObjectFields.length > 0) {
    const className = scheme.arrayElementClassName || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
    if (language === "java") {
      return `${className}[]`;
    }
    if (language === "csharp") {
      return `${className}[]`;
    }
  }
  
  if (language === "java") {
    return `${getTypeString(elementType, "java")}[]`;
  }
  if (language === "csharp") {
    return `${getTypeString(elementType, "csharp")}[]`;
  }
  if (language === "golang") {
    return `[]${getTypeString(elementType, "golang")}`;
  }
  return "array";
};

const getListTypeString = (scheme: ArgumentSchema, language: CodeLanguage): string => {
  const elementType = scheme.arrayElementType ?? "int";
  
  if (language === "java") {
    return `List<${getTypeString(elementType, "java")}>`;
  }
  if (language === "csharp") {
    return `List<${getTypeString(elementType, "csharp")}>`;
  }
  return "List";
};

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

// Исправленная функция buildTestCode для всех языков с поддержкой логов
const buildTestCode = (
  userCode: string,
  input: string,
  lang: CodeLanguage,
  funcName: string | null,
  preformattedArgs?: string // Для JS/Python с аргументами из схемы
): string => {
  if (!funcName) return userCode;

  // Если переданы предварительно отформатированные аргументы - используем их
  const argsStr = preformattedArgs ?? (() => {
    const args = parseArguments(input);
    return formatArgumentsForCode(args);
  })();

  switch (lang) {
    case "javascript":
      return `${userCode}

// Перехватываем все методы console
const __originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

const __logs = [];

console.log = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('📌 ' + message);
  __originalConsole.log.apply(console, args);
};

console.error = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('❌ ' + message);
  __originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('⚠️ ' + message);
  __originalConsole.warn.apply(console, args);
};

console.info = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('ℹ️ ' + message);
  __originalConsole.info.apply(console, args);
};

try {
  const result = ${funcName}(${argsStr});
  
  // Восстанавливаем console
  console.log = __originalConsole.log;
  console.error = __originalConsole.error;
  console.warn = __originalConsole.warn;
  console.info = __originalConsole.info;
  
  // Выводим логи отдельно
  if (__logs.length > 0) {
    console.log('\\n===LOGS_START===');
    __logs.forEach(log => console.log(log));
    console.log('===LOGS_END===');
  }
  
  // Выводим результат
  console.log('===RESULT_START===');
  console.log(JSON.stringify(result));
  console.log('===RESULT_END===');
  
} catch (error) {
  // Восстанавливаем console
  console.log = __originalConsole.log;
  console.error = __originalConsole.error;
  console.warn = __originalConsole.warn;
  console.info = __originalConsole.info;
  
  console.log('===RESULT_START===');
  console.log(JSON.stringify({ error: error.message }));
  console.log('===RESULT_END===');
}`;

    case "python":
      return `${userCode}
import json
import sys
from io import StringIO

# Перехватываем stdout и stderr
__old_stdout = sys.stdout
__old_stderr = sys.stderr
__stdout_buffer = StringIO()
__stderr_buffer = StringIO()
sys.stdout = __stdout_buffer
sys.stderr = __stderr_buffer

try:
    result = ${funcName}(${argsStr})
    
    # Восстанавливаем stdout/stderr
    sys.stdout = __old_stdout
    sys.stderr = __old_stderr
    
    # Получаем логи
    __stdout = __stdout_buffer.getvalue()
    __stderr = __stderr_buffer.getvalue()
    
    # Выводим логи отдельно
    if __stdout or __stderr:
        print("===LOGS_START===")
        if __stdout:
            print(__stdout, end='')
        if __stderr:
            print("STDERR:", __stderr, end='')
        print("===LOGS_END===")
    
    # Выводим результат
    print("===RESULT_START===")
    print(json.dumps(result))
    print("===RESULT_END===")
    
except Exception as e:
    sys.stdout = __old_stdout
    sys.stderr = __old_stderr
    print("===RESULT_START===")
    print(json.dumps({"error": str(e)}))
    print("===RESULT_END===")`;

    case "java":
      return buildJavaTestSuiteWithLogs(userCode, [{ input, expectedOutput: "" }], funcName);

    case "csharp":
      // Для одиночного теста используем buildCSharpTestSuite с одним тест-кейсом
      return buildCSharpTestSuite(userCode, [{ input, expectedOutput: "" }], funcName);

    case "golang":
      // Проверяем, есть ли уже импорты в коде пользователя
      const hasImports = userCode.includes("import (");

      if (hasImports) {
        // Если есть импорты, добавляем наши импорты к существующим
        return (
          userCode.replace(
            /import\s+\(([\s\S]*?)\)/,
            `import ($1
    "encoding/json"
    "fmt"
    "os"
    "bytes"
    "io"
    "strings")`
          ) +
          `

func main() {
    old := os.Stdout
    r, w, _ := os.Pipe()
    os.Stdout = w
    
    outC := make(chan string)
    go func() {
        var buf bytes.Buffer
        io.Copy(&buf, r)
        outC <- buf.String()
    }()
    
    result := ${funcName}(${argsStr})
    
    w.Close()
    os.Stdout = old
    logs := <-outC
    
    if logs != "" {
        fmt.Println("===LOGS_START===")
        fmt.Print(logs)
        if !strings.HasSuffix(logs, "\\n") {
            fmt.Println()
        }
        fmt.Println("===LOGS_END===")
    }
    
    fmt.Println("===RESULT_START===")
    jsonResult, _ := json.Marshal(result)
    fmt.Println(string(jsonResult))
    fmt.Println("===RESULT_END===")
}`
        );
      } else {
        // Если импортов нет, добавляем новый блок импортов
        return (
          userCode.replace(
            /package main\n/,
            `package main

import (
    "encoding/json"
    "fmt"
    "os"
    "bytes"
    "io"
    "strings"
)
`
          ) +
          `

func main() {
    old := os.Stdout
    r, w, _ := os.Pipe()
    os.Stdout = w
    
    outC := make(chan string)
    go func() {
        var buf bytes.Buffer
        io.Copy(&buf, r)
        outC <- buf.String()
    }()
    
    result := ${funcName}(${argsStr})
    
    w.Close()
    os.Stdout = old
    logs := <-outC
    
    if logs != "" {
        fmt.Println("===LOGS_START===")
        fmt.Print(logs)
        if !strings.HasSuffix(logs, "\\n") {
            fmt.Println()
        }
        fmt.Println("===LOGS_END===")
    }
    
    fmt.Println("===RESULT_START===")
    jsonResult, _ := json.Marshal(result)
    fmt.Println(string(jsonResult))
    fmt.Println("===RESULT_END===")
}`
        );
      }

    default:
      return userCode;
  }
};

const compareOutputs = (actual: any, expected: any): boolean => {
  if (actual == null && expected == null) return true;
  if (actual == null || expected == null) return false;

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    return actual.every((item, index) => JSON.stringify(item) === JSON.stringify(expected[index]));
  }

  if (typeof actual === "object" && typeof expected === "object") {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  return String(actual).trim() === String(expected).trim();
};

interface ConstraintResult {
  type: CodeConstraintType;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  value?: number | string[] | boolean;
}

// Полностью исправленный PreviewCodeTask с поддержкой логов
function PreviewCodeTask({
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
      : (block.startCode ?? getDefaultStarterCode(block.language ?? "javascript"));
  }, [testAnswer, block.startCode, block.language]);

  const displayCode = stripMainMethod(getCurrentCode(), block.language ?? "javascript");

  // Обработчик изменения кода
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

      if (block.language === "java" && funcName) {
        codeToRun = addJavaMainMethod(currentCode, funcName, "5");
      }

      const res = await CodeService.executeCode({
        language: block.language ?? "javascript",
        code: codeToRun,
      });

      // Парсим вывод для отделения логов от результата
      let output = "";
      if (res.output) {
        // Разбиваем на строки для обработки
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
              output += "📋 Логи выполнения:\n" + currentLogs.join("\n") + "\n\n";
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
              output += "✅ Результат функции:\n" + currentResult.join("\n");
            }
            continue;
          }

          if (inLogs) {
            currentLogs.push(line);
          } else if (inResult) {
            currentResult.push(line);
          } else if (!inLogs && !inResult && !line.includes("===")) {
            // Если нет маркеров, добавляем весь вывод
            output += line + "\n";
          }
        }

        // Если не нашли маркеры, используем весь вывод
        if (!output && res.output) {
          output = res.output;
        }
      }

      if (res.error) {
        output += `\n❌ Ошибка: ${res.error}`;
      }

      setConsoleOutput(output || "✅ Код выполнен успешно (нет вывода)");
    } catch (e) {
      setConsoleOutput(`❌ Ошибка выполнения: ${e}`);
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
            name: "📏 Максимум строк кода",
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
            name: "🚫 Запрещённые слова",
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
            name: "💬 Без комментариев",
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
            name: "📢 Без отладочного вывода",
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
            name: "🔄 Цикломатическая сложность",
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
            name: "💾 Использование памяти",
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
            name: "🔑 Обязательные ключевые слова",
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

            if (block.language === "java" && funcName) {
              codeToRun = addJavaMainMethod(code, funcName, "5");
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
              name: "⏱ Время выполнения",
              passed: actualTime <= maxTime,
              expected: `≤ ${maxTime} мс`,
              actual: `${actualTime} мс`,
              value: maxTime,
            });
          } catch {
            results.push({
              type: "maxTimeMs",
              name: "⏱ Время выполнения",
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

        // Специальная обработка для Java
        if (block.language === "java") {
          // Преобразуем тест-кейсы в новый формат с аргументами
          const formattedTestCases = (block.testCases ?? []).map(tc => {
            const argsInput = formatArgsForJavaOrCSharp(tc.args, block.argumentScheme ?? [], "java");
            return {
              input: argsInput || tc.input || "",
              expectedOutput: tc.expectedOutput
            };
          });
          
          // Сначала оборачиваем код с тестами, потом добавляем классы
          const codeWithTests = buildJavaTestSuite(currentCode, formattedTestCases, funcName);
          
          // Добавляем определения классов для объектов в аргументах ПОСЛЕ всего кода
          const objectClasses = generateObjectClasses(block.argumentScheme ?? [], "java");
          const codeToRun = objectClasses 
            ? `${codeWithTests}\n\n${objectClasses}` 
            : codeWithTests;

          console.log("Java code to run:", codeToRun); // Для отладки

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

          console.log("Java output:", output); // Для отладки

          // Парсим вывод для каждого теста
          for (let i = 0; i < block.testCases.length; i++) {
            const testNum = i + 1;
            let inLogs = false;
            let inResult = false;
            let currentLogs: string[] = [];
            let currentResult: string[] = [];
            let testLogs: string[] = [];

            for (const line of lines) {
              // Поиск начала логов для текущего теста
              if (line.includes(`===LOGS_START_${testNum}===`)) {
                inLogs = true;
                currentLogs = [];
                continue;
              }

              // Поиск конца логов
              if (line.includes(`===LOGS_END_${testNum}===`)) {
                inLogs = false;
                if (currentLogs.length > 0) {
                  testLogs.push(`📋 Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`);
                  testLogs.push(currentLogs.join("\n"));
                  testLogs.push("");
                }
                continue;
              }

              // Поиск начала результата
              if (line.includes(`===RESULT_START_${testNum}===`)) {
                inResult = true;
                currentResult = [];
                continue;
              }

              // Поиск конца результата
              if (line.includes(`===RESULT_END_${testNum}===`)) {
                inResult = false;
                if (currentResult.length > 0) {
                  const actual = currentResult.join("\n").trim();
                  const expected = block.testCases[i].expectedOutput.trim();

                  // Сравниваем результаты
                  let actualParsed: any;
                  let expectedParsed: any;

                  try {
                    // Пробуем распарсить как JSON
                    actualParsed = JSON.parse(actual);
                  } catch {
                    // Если не JSON, оставляем как строку
                    actualParsed = actual;
                  }

                  try {
                    expectedParsed = JSON.parse(expected);
                  } catch {
                    expectedParsed = expected;
                  }

                  const passed = compareOutputs(actualParsed, expectedParsed);

                  results.push({
                    input: getDisplayInput(block.testCases[i], block.argumentScheme, block.language),
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

            // Добавляем логи теста в общие логи
            if (testLogs.length > 0) {
              allLogs.push(...testLogs);
            }
          }
        } else if (block.language === "csharp") {
          // Преобразуем тест-кейсы в новый формат с аргументами
          const formattedTestCases = (block.testCases ?? []).map(tc => {
            const argsInput = formatArgsForJavaOrCSharp(tc.args, block.argumentScheme ?? [], "csharp");
            return {
              input: argsInput || tc.input || "",
              expectedOutput: tc.expectedOutput
            };
          });
          
          // Сначала оборачиваем код с тестами, потом добавляем классы
          const codeWithTests = buildCSharpTestSuite(currentCode, formattedTestCases, funcName);
          
          // Добавляем определения классов для объектов в аргументах ПОСЛЕ всего кода
          const objectClasses = generateObjectClasses(block.argumentScheme ?? [], "csharp");
          const codeToRun = objectClasses 
            ? `${codeWithTests}\n\n${objectClasses}` 
            : codeWithTests;

          console.log("C# code to run:", codeToRun); // Для отладки

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

          console.log("C# output:", output); // Для отладки

          // Парсим вывод для каждого теста
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
                  testLogs.push(`📋 Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`);
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
                  const expected = block.testCases[i].expectedOutput.trim();

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
                    input: getDisplayInput(block.testCases[i], block.argumentScheme, block.language),
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
        } else if (block.language === "javascript" || block.language === "python") {
          // Для JavaScript и Python используем схему аргументов
          const lang = block.language;
          
          for (let i = 0; i < block.testCases.length; i++) {
            const tc = block.testCases[i];
            
            // Форматируем аргументы с использованием схемы
            const argsInput = formatArgsForDynamicLang(tc.args, block.argumentScheme ?? [], lang);
            
            // Если есть аргументы в схеме, используем их, иначе используем старый input
            const inputToUse = (block.argumentScheme?.length ?? 0) > 0 ? argsInput : (tc.input || "");
            
            if (!inputToUse || !tc.expectedOutput) {
              setTestError("Заполните все тест-кейсы (входные данные и ожидаемый вывод)");
              return;
            }

            // Добавляем определения классов для объектов
            const objectClasses = generateObjectClasses(block.argumentScheme ?? [], lang);
            const codeWithClasses = objectClasses 
              ? `${currentCode}\n\n${objectClasses}` 
              : currentCode;

            // Для JS/Python передаём предварительно отформатированные аргументы
            const codeToRun = buildTestCode(
              codeWithClasses,
              "",
              lang,
              funcName,
              inputToUse
            );

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
                  testLogs.push(`📋 Логи теста #${testNum} (вход: ${getDisplayInput(block.testCases[i], block.argumentScheme, block.language)}):`);
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
                  const expected = tc.expectedOutput.trim();

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
                    input: getDisplayInput(block.testCases[i], block.argumentScheme, block.language),
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
        } else {
          // Для остальных языков (как было раньше)
          for (const tc of block.testCases) {
            if (!tc.input || !tc.expectedOutput) {
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
                  allLogs.push(`📋 Логи для входа "${tc.input}":`);
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
                    expectedParsed = JSON.parse(tc.expectedOutput);
                  } catch {
                    expectedParsed = tc.expectedOutput;
                  }

                  const passed = compareOutputs(actualParsed, expectedParsed);

                  results.push({
                    input: tc.input,
                    expected: tc.expectedOutput,
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

        // Устанавливаем консольные логи
        if (allLogs.length > 0) {
          setConsoleOutput(allLogs.join("\n"));
        }

        setTestResults(results);

        // Проверка ограничений
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
              (r, i) =>
                `❌ Тест ${results.findIndex((tr) => tr === r) + 1}: вход=${r.input}, ожидалось=${r.expected}, получено=${r.actual}`
            );

          const failedConstraints = constraintCheckResults
            .filter((c) => !c.passed)
            .map((c) => `❌ ${c.name}: ожидалось ${c.expected}, получено ${c.actual}`);

          const errorMessages = [];

          if (failedTests.length > 0) {
            errorMessages.push(`❌ Провалено тестов: ${failedTests.length} из ${results.length}`);
            errorMessages.push(...failedTests);
          }

          if (failedConstraints.length > 0) {
            errorMessages.push(`\n❌ Не пройдены ограничения:`);
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

      {(block.language === "java" || block.language === "csharp") && 
       block.argumentScheme && 
       block.argumentScheme.some(a => a.type === "object" && a.objectFields) && (
        <div className={styles.objectDescriptions}>
          <h4>Описание классов:</h4>
          <pre className={styles.objectClassCode}>
            {generateObjectClassesForPreview(block.argumentScheme, block.language)}
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
          color="#4CAF50"
          width="120px"
          textColor="#fff"
          text={isRunning ? "Запуск..." : "Запустить"}
          onClick={runUserCode}
          disabled={isRunning}
        />
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
            <h4>📊 Результаты тестирования</h4>
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
                    {result.passed ? "✅ Пройден" : "❌ Провален"}
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
                  <span className={styles.constraintStatus}>{constraint.passed ? "✅" : "❌"}</span>
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

function PreviewBlock({
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
  onResults?: (results: any) => void;
}) {
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

  if (block.type === "image")
    return block.url ? <img src={block.url} alt="" className={styles.previewImg} /> : null;

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
