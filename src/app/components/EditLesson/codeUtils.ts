/* eslint-disable */

import type { CodeLanguage } from "@/app/http/codeService";

import type { ArgumentSchema, ArgumentType, CodeConstraintType, TestCaseArgument } from "./types";

export const stripMainMethod = (code: string, language: CodeLanguage): string => {
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

export const addJavaMainMethod = (
  code: string,
  funcName: string | null,
  input: string = "5"
): string => {
  if (!funcName) return code;

  const mainMethod = `
    public static void main(String[] args) {
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
  }

  const codeWithoutLastBrace = code.trim().replace(/\}\s*$/, "");
  return `${codeWithoutLastBrace}\n${mainMethod}\n}`;
};

export const parseArguments = (input: string): any[] => {
  if (!input.trim()) return [];

  try {
    if (input.trim().startsWith("[") && input.trim().endsWith("]")) {
      return JSON.parse(input);
    }
  } catch {
    // ignore non-JSON input
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

export const parseValue = (value: string): any => {
  if (value === "") return "";

  try {
    return JSON.parse(value);
  } catch {
    // ignore non-JSON input
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

export const formatArgumentsForCode = (args: any[]): string => {
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

export const getTypeString = (type_: ArgumentType, language: CodeLanguage): string => {
  const typeMap: Record<ArgumentType, Record<CodeLanguage, string>> = {
    int: {
      javascript: "",
      python: "int",
      csharp: "int",
      java: "int",
      golang: "int",
      cpp: "int",
    },
    string: {
      javascript: "",
      python: "str",
      csharp: "string",
      java: "String",
      golang: "string",
      cpp: "string",
    },
    number: {
      javascript: "number",
      python: "float",
      csharp: "double",
      java: "double",
      golang: "float64",
      cpp: "double",
    },
    boolean: {
      javascript: "",
      python: "bool",
      csharp: "bool",
      java: "boolean",
      golang: "bool",
      cpp: "bool",
    },
    double: {
      javascript: "",
      python: "float",
      csharp: "double",
      java: "double",
      golang: "float64",
      cpp: "double",
    },
    float: {
      javascript: "",
      python: "float",
      csharp: "float",
      java: "float",
      golang: "float32",
      cpp: "float",
    },
    long: {
      javascript: "",
      python: "int",
      csharp: "long",
      java: "long",
      golang: "int64",
      cpp: "long",
    },
    char: {
      javascript: "",
      python: "str",
      csharp: "char",
      java: "char",
      golang: "rune",
      cpp: "char",
    },
    byte: {
      javascript: "",
      python: "bytes",
      csharp: "byte",
      java: "byte",
      golang: "byte",
      cpp: "byte",
    },
    short: {
      javascript: "",
      python: "int",
      csharp: "short",
      java: "short",
      golang: "int16",
      cpp: "short",
    },
    object: {
      javascript: "",
      python: "",
      csharp: "object",
      java: "Object",
      golang: "interface{}",
      cpp: "object",
    },
    array: {
      javascript: "",
      python: "list",
      csharp: "object",
      java: "int[]",
      golang: "[]int",
      cpp: "vector",
    },
    array_int: {
      javascript: "",
      python: "list",
      csharp: "int[]",
      java: "int[]",
      golang: "[]int",
      cpp: "vector",
    },
    array_string: {
      javascript: "",
      python: "list",
      csharp: "string[]",
      java: "String[]",
      golang: "[]string",
      cpp: "vector",
    },
    array_double: {
      javascript: "",
      python: "list",
      csharp: "double[]",
      java: "double[]",
      golang: "[]float64",
      cpp: "vector",
    },
    array_float: {
      javascript: "",
      python: "list",
      csharp: "float[]",
      java: "float[]",
      golang: "[]float32",
      cpp: "vector",
    },
    array_long: {
      javascript: "",
      python: "list",
      csharp: "long[]",
      java: "long[]",
      golang: "[]int64",
      cpp: "vector",
    },
    array_boolean: {
      javascript: "",
      python: "list",
      csharp: "bool[]",
      java: "boolean[]",
      golang: "[]bool",
      cpp: "vector",
    },
    array_char: {
      javascript: "",
      python: "list",
      csharp: "char[]",
      java: "char[]",
      golang: "[]rune",
      cpp: "vector",
    },
    list: {
      javascript: "",
      python: "list",
      csharp: "List<object>",
      java: "List<Object>",
      golang: "[]interface{}",
      cpp: "vector",
    },
    map: {
      javascript: "Object",
      python: "dict",
      csharp: "Dictionary<string, object>",
      java: "Map<String, Object>",
      golang: "map[string]interface{}",
      cpp: "map",
    },
    void: {
      javascript: "void",
      python: "None",
      csharp: "void",
      java: "void",
      golang: "",
      cpp: "void",
    },
  };

  return typeMap[type_]?.[language] ?? type_;
};

export const getReturnTypeString = (type_: ArgumentType, language: CodeLanguage): string => {
  if (type_ === "void") {
    return language === "java" || language === "csharp" || language === "cpp" ? "void" : "";
  }
  if (type_ === "object") {
    return language === "java" ? "Object" : language === "golang" ? "interface{}" : "object";
  }
  if (type_ === "list") {
    return language === "csharp"
      ? "List<object>"
      : language === "java"
        ? "List<Object>"
        : language === "golang"
          ? "[]interface{}"
          : "object";
  }
  return getTypeString(type_, language);
};

export const getDefaultReturnValue = (type_: ArgumentType, language?: CodeLanguage): string => {
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
      if (isPython || isGo) return 'return ""';
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
      return "";
    default:
      if (isPython) return "return None";
      if (isGo) return "return nil";
      return "return null;";
  }
};

export const getArrayTypeString = (scheme: ArgumentSchema, language: CodeLanguage): string => {
  const elementType = scheme.arrayElementType ?? "int";

  if (scheme.arrayElementObjectFields && scheme.arrayElementObjectFields.length > 0) {
    const className =
      scheme.arrayElementClassName || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
    if (language === "java" || language === "csharp") {
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

export const getListTypeString = (scheme: ArgumentSchema, language: CodeLanguage): string => {
  const elementType = scheme.arrayElementType ?? "int";

  if (language === "java") {
    return `List<${getTypeString(elementType, "java")}>`;
  }
  if (language === "csharp") {
    return `List<${getTypeString(elementType, "csharp")}>`;
  }
  return "List";
};

export const getDefaultStarterCode = (
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
    case "python": {
      const pythonArgs = args.map((a) => a.name).join(", ");
      return `def your_function(${pythonArgs}):
    # Ваш код здесь
    print("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""})
    ${returnValue}`;
    }
    case "golang": {
      const goArgsStr = args
        .map((arg) => `${arg.name} ${getTypeString(arg.type, "golang")}`)
        .join(", ");
      const goRetStr = getReturnTypeString(returnType, "golang");

      return `package main

import "fmt"

func yourFunction(${goArgsStr}) ${goRetStr} {
    // Ваш код здесь
    fmt.Println("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""})
    ${returnValue}
}`;
    }
    default: {
      const jsArgs = args.map((a) => a.name).join(", ");
      return `function yourFunction(${jsArgs}) {
    // Ваш код здесь
    console.log("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""});
    ${returnValue}
}`;
    }
  }
};

export const generateObjectClasses = (args: ArgumentSchema[], language: CodeLanguage): string => {
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
        className =
          arg.arrayElementClassName || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      } else {
        className = arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      }

      if (language === "java") {
        const accessModifier = "private";
        const fields = objectFields
          .map((f) => `        ${accessModifier} ${getTypeString(f.type, language)} ${f.name};`)
          .join("\n");
        const constructorParams = objectFields
          .map((f) => `${getTypeString(f.type, language)} ${f.name}`)
          .join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n        ");
        const constructor =
          objectFields.length > 0
            ? `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }`
            : "";
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
        const fields = objectFields
          .map((f) => `        public ${getTypeString(f.type, language)} ${f.name};`)
          .join("\n");
        const constructorParams = objectFields
          .map((f) => `${getTypeString(f.type, language)} ${f.name}`)
          .join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n        ");
        const constructor =
          objectFields.length > 0
            ? `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }`
            : "";
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
        const constructorParams = objectFields.map((f) => f.name).join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n    ");
        return objectFields.length > 0
          ? `
class ${className} {
    constructor(${constructorParams}) {
        ${constructorBody}
    }
}`
          : `
class ${className} {
}`;
      }
      if (language === "python") {
        const constructorParams = objectFields.map((f) => f.name).join(", ");
        const constructorBody = objectFields
          .map((f) => `self.${f.name} = ${f.name}`)
          .join("\n        ");
        return objectFields.length > 0
          ? `
class ${className}:
    def __init__(self, ${constructorParams}):
        ${constructorBody}`
          : `
class ${className}:
    pass`;
      }
      return "";
    })
    .join("\n\n");
};

export const buildCSharpTestSuite = (
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
using System.Text.Json.Serialization;
using System.Collections.Generic;
`;

  return (
    usings +
    "\n" +
    userCode.replace(/^using.*;(\r\n|\r|\n)?/gm, "") +
    `
    
public class Runner {
    public static void Main() {
${testCasesCode}
    }
}`
  );
};

export const buildJavaTestSuiteWithLogs = (
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
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            java.io.PrintStream originalOut = System.out;
            System.setOut(new java.io.PrintStream(baos));
            
            try {
                Object result = ${funcName}(${argsStr});
                
                System.setOut(originalOut);
                
                String logs = baos.toString();
                
                if (!logs.isEmpty()) {
                    System.out.println("===LOGS_START_" + ${index + 1} + "===");
                    System.out.print(logs);
                    System.out.println("===LOGS_END_" + ${index + 1} + "===");
                }
                
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
  }

  const codeWithoutLastBrace = userCode.trim().replace(/\}\s*$/, "");
  return `${codeWithoutLastBrace}

    public static void main(String[] args) {
${testCasesCode}
    }
}`;
};

export const buildJavaTestSuite = (
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
                
                if (logs != null && !logs.isEmpty()) {
                    System.out.println("===LOGS_START_" + ${testNum} + "===");
                    System.out.print(logs);
                    if (!logs.endsWith("\\n")) {
                        System.out.println();
                    }
                    System.out.println("===LOGS_END_" + ${testNum} + "===");
                }
                
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

  if (userCode.includes("public static void main")) {
    return userCode.replace(
      /public\s+static\s+void\s+main\(String\[\]\s*args\)\s*\{[\s\S]*?\}/,
      `public static void main(String[] args) {
${testCasesCode}
    }`
    );
  }

  const trimmedCode = userCode.trim();
  const mainClassEnd = trimmedCode.lastIndexOf("}");

  let codeWithoutMainBrace: string;
  if (mainClassEnd > 0) {
    const afterBrace = trimmedCode.substring(mainClassEnd + 1).trim();
    if (afterBrace.length > 0) {
      codeWithoutMainBrace = trimmedCode.substring(0, mainClassEnd);
    } else {
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
};

export const formatArgsForJavaOrCSharp = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: CodeLanguage
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  const cleanValue = (val: string) => {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  };

  const args = testCaseArgs
    .map((arg, idx) => {
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
        const fields = scheme.objectFields.map((f) => {
          const val = cleanValue(objValues[f.name] ?? "");
          if (f.type === "string") return `"${val}"`;
          if (f.type === "boolean") return val.toLowerCase() === "true" ? "true" : "false";
          if (f.type === "char") return `'${val}'`;
          return val;
        });

        if (language === "java") {
          const className =
            scheme.className || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
          return `new ${className}(${fields.join(", ")})`;
        }
        if (language === "csharp") {
          const className =
            scheme.className || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
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
              return `new ${typeToUse}[] { ${formatted.join(", ")} }`;
            }
          } catch {
            // ignore invalid JSON
          }
        }

        if (arg.objectValues && Object.keys(arg.objectValues).length > 0) {
          const elements = Object.values(arg.objectValues).map((val: any) => {
            if (elementType === "string") return `"${val}"`;
            if (elementType === "boolean") {
              return val.toLowerCase() === "true" ? "true" : "false";
            }
            return String(val);
          });
          return `new ${typeToUse}[] { ${elements.join(", ")} }`;
        }
        return `new ${typeToUse}[0]`;
      }

      if (scheme.type === "array" || scheme.type === "list") {
        const arrayElementType = scheme.arrayElementType ?? "int";
        if (scheme.arrayElementObjectFields) {
          const arrayObjValues = arg.objectValues ?? {};
          const elements = Object.entries(arrayObjValues).map(([, val]) => {
            const objFields = scheme.arrayElementObjectFields!;
            const fields = objFields.map((f) => {
              const fieldVal = cleanValue(
                (val as unknown as Record<string, string>)?.[f.name] ?? ""
              );
              if (f.type === "string") return `"${fieldVal}"`;
              if (f.type === "boolean") return fieldVal.toLowerCase() === "true" ? "true" : "false";
              if (f.type === "char") return `'${fieldVal}'`;
              return fieldVal;
            });

            const elemClassName =
              scheme.arrayElementClassName ||
              scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);

            if (language === "java") {
              return `new ${elemClassName}(${fields.join(", ")})`;
            }
            return `new ${elemClassName}(${fields.join(", ")})`;
          });
          const arrClassName =
            scheme.arrayElementClassName ||
            scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
          return `new ${arrClassName}[] { ${elements.join(", ")} }`;
        }

        if (arg.value && arg.value.trim().startsWith("[")) {
          try {
            const arr = JSON.parse(arg.value);
            if (Array.isArray(arr)) {
              const formatted = arr.map((item) => {
                if (arrayElementType === "string") return `"${item}"`;
                if (arrayElementType === "boolean") return item ? "true" : "false";
                return String(item);
              });
              return `new ${getTypeString(arrayElementType, language)}[] { ${formatted.join(", ")} }`;
            }
          } catch {
            // ignore invalid JSON
          }
        }

        return arg.value;
      }

      if (scheme.type === "object" && !scheme.objectFields) {
        if (arg.value && arg.value.trim().startsWith("{")) {
          try {
            const obj = JSON.parse(arg.value);
            if (typeof obj === "object" && obj !== null && language === "java") {
              const entries = Object.entries(obj)
                .map(([k, v]) => {
                  const val = typeof v === "string" ? `"${v}"` : String(v);
                  return `"${k}", ${val}`;
                })
                .join(", ");
              return `new java.util.HashMap<>() {{ put(${entries}); }}`;
            }
          } catch {
            // ignore invalid JSON
          }
        }
      }

      if (scheme.type === "map") {
        if (arg.value && arg.value.trim().startsWith("{")) {
          try {
            const obj = JSON.parse(arg.value);
            if (typeof obj === "object" && obj !== null && language === "java") {
              const entries = Object.entries(obj)
                .map(([k, v]) => {
                  const val = typeof v === "string" ? `"${v}"` : String(v);
                  return `"${k}", ${val}`;
                })
                .join(", ");
              return `new java.util.HashMap<>() {{ put(${entries}); }}`;
            }
          } catch {
            // ignore invalid JSON
          }
        }
      }

      return arg.value;
    })
    .filter(Boolean);

  return args.join(", ");
};

export const formatArgsForDynamicLang = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: CodeLanguage
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  const cleanValue = (val: string) => {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  };

  const args = testCaseArgs
    .map((arg, idx) => {
      const scheme = argumentScheme[idx];
      if (!scheme) return null;

      const cleanVal = cleanValue(arg.value);

      if (scheme.type === "string") return `"${cleanVal}"`;
      if (scheme.type === "number") return cleanVal;
      if (scheme.type === "char") return `'${cleanVal}'`;
      if (scheme.type === "boolean") {
        if (language === "python") {
          return cleanVal.toLowerCase() === "true" ? "True" : "False";
        }
        return cleanVal.toLowerCase() === "true" ? "true" : "false";
      }
      if (scheme.type === "object") {
        return arg.value || "{}";
      }

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
            // ignore invalid JSON
          }
        }
        return arg.value;
      }

      if (scheme.type === "array" || scheme.type === "list") {
        const arrayElementType = scheme.arrayElementType ?? "int";
        if (scheme.arrayElementObjectFields) {
          const arrayObjValues = arg.objectValues ?? {};
          const className =
            scheme.arrayElementClassName ||
            scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
          const elements = Object.entries(arrayObjValues).map(([, val]) => {
            const objFields = scheme.arrayElementObjectFields!;
            const fields = objFields.map((f) => {
              const fieldVal = cleanValue(
                (val as unknown as Record<string, string>)?.[f.name] ?? ""
              );
              if (f.type === "string") return `${f.name}: "${fieldVal}"`;
              if (f.type === "boolean") {
                if (language === "python") {
                  return `${f.name}=${fieldVal.toLowerCase() === "true" ? "True" : "False"}`;
                }
                return `${f.name}: ${fieldVal.toLowerCase() === "true" ? "true" : "false"}`;
              }
              if (f.type === "char") return `${f.name}: '${fieldVal}'`;
              return `${f.name}: ${fieldVal}`;
            });

            if (language === "javascript") {
              return `new ${className}({ ${fields.join(", ")} })`;
            }
            if (language === "python") {
              const pyFields = objFields.map((f) => {
                const fieldVal = cleanValue(
                  (val as unknown as Record<string, string>)?.[f.name] ?? ""
                );
                if (f.type === "string") return `${f.name}="${fieldVal}"`;
                if (f.type === "boolean") {
                  return `${f.name}=${fieldVal.toLowerCase() === "true" ? "True" : "False"}`;
                }
                return `${f.name}=${fieldVal}`;
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
              const formatted = arr.map((item) => {
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
            // ignore invalid JSON
          }
        }
        return arg.value;
      }

      return arg.value;
    })
    .filter(Boolean);

  return args.join(", ");
};

export const getDisplayInput = (
  testCase: { input?: string; args?: TestCaseArgument[] } | undefined,
  argumentScheme: ArgumentSchema[] | undefined,
  language: CodeLanguage | undefined
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

export const generateObjectClassesForPreview = (
  args: ArgumentSchema[],
  language: CodeLanguage
): string => {
  const objectArgs = args.filter((a) => a.type === "object" && a.objectFields);
  if (objectArgs.length === 0) return "";

  return objectArgs
    .map((arg) => {
      const className = arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
      const objectFields = arg.objectFields ?? [];

      if (language === "java") {
        const fields = objectFields
          .map((f) => `    private ${getTypeString(f.type, language)} ${f.name};`)
          .join("\n");
        const constructorParams = objectFields
          .map((f) => `${getTypeString(f.type, language)} ${f.name}`)
          .join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n        ");
        const constructor =
          objectFields.length > 0
            ? `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }`
            : "";
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
        return `class ${className} {
${fields}
${constructor}
${gettersSetters}
}`;
      }
      if (language === "csharp") {
        const fields = objectFields
          .map((f) => `    private ${getTypeString(f.type, language)} ${f.name};`)
          .join("\n");
        const constructorParams = objectFields
          .map((f) => `${getTypeString(f.type, language)} ${f.name}`)
          .join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n        ");
        const constructor =
          objectFields.length > 0
            ? `
    public ${className}(${constructorParams}) {
        ${constructorBody}
    }`
            : "";
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
${fields}
${constructor}
${gettersSetters}
}`;
      }
      if (language === "javascript") {
        const constructorParams = objectFields.map((f) => f.name).join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n    ");
        return objectFields.length > 0
          ? `
class ${className} {
    constructor(${constructorParams}) {
        ${constructorBody}
    }
}`
          : `
class ${className} {
}`;
      }
      if (language === "python") {
        const constructorParams = objectFields.map((f) => f.name).join(", ");
        const constructorBody = objectFields
          .map((f) => `self.${f.name} = ${f.name}`)
          .join("\n        ");
        return objectFields.length > 0
          ? `
class ${className}:
    def __init__(self, ${constructorParams}):
        ${constructorBody}`
          : `
class ${className}:
    pass`;
      }
      return "";
    })
    .join("\n\n");
};

export const extractFunctionName = (code: string, lang: CodeLanguage): string | null => {
  if (!code) return null;

  try {
    switch (lang) {
      case "javascript": {
        const jsMatch = code.match(
          /function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>|let\s+(\w+)\s*=\s*\([^)]*\)\s*=>|var\s+(\w+)\s*=\s*\([^)]*\)\s*=>/
        );
        return jsMatch ? jsMatch[1] || jsMatch[2] || jsMatch[3] || jsMatch[4] : null;
      }
      case "python": {
        const pyMatch = code.match(/def\s+(\w+)\s*\(/);
        return pyMatch ? pyMatch[1] : null;
      }
      case "golang": {
        const goMatch = code.match(/func\s+(\w+)\s*\(/);
        return goMatch ? goMatch[1] : null;
      }
      case "csharp": {
        const csMatch = code.match(/public\s+static\s+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)/);
        return csMatch ? csMatch[1] : null;
      }
      case "java": {
        const javaMatch = code.match(/public\s+static\s+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)/);
        return javaMatch ? javaMatch[1] : null;
      }
      default:
        return null;
    }
  } catch (e) {
    console.error("Error extracting function name:", e);
    return null;
  }
};

export const buildTestCode = (
  userCode: string,
  input: string,
  lang: CodeLanguage,
  funcName: string | null,
  preformattedArgs?: string
): string => {
  if (!funcName) return userCode;

  const argsStr =
    preformattedArgs ??
    (() => {
      const args = parseArguments(input);
      return formatArgumentsForCode(args);
    })();

  switch (lang) {
    case "javascript":
      return `${userCode}

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
  
  console.log = __originalConsole.log;
  console.error = __originalConsole.error;
  console.warn = __originalConsole.warn;
  console.info = __originalConsole.info;
  
  if (__logs.length > 0) {
    console.log('\\n===LOGS_START===');
    __logs.forEach(log => console.log(log));
    console.log('===LOGS_END===');
  }
  
  console.log('===RESULT_START===');
  console.log(JSON.stringify(result));
  console.log('===RESULT_END===');
  
} catch (error) {
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

__old_stdout = sys.stdout
__old_stderr = sys.stderr
__stdout_buffer = StringIO()
__stderr_buffer = StringIO()
sys.stdout = __stdout_buffer
sys.stderr = __stderr_buffer

try:
    result = ${funcName}(${argsStr})
    
    sys.stdout = __old_stdout
    sys.stderr = __old_stderr
    
    __stdout = __stdout_buffer.getvalue()
    __stderr = __stderr_buffer.getvalue()
    
    if __stdout or __stderr:
        print("===LOGS_START===")
        if __stdout:
            print(__stdout, end='')
        if __stderr:
            print("STDERR:", __stderr, end='')
        print("===LOGS_END===")
    
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
      return buildCSharpTestSuite(userCode, [{ input, expectedOutput: "" }], funcName);

    case "golang": {
      const hasImports = userCode.includes("import (");

      if (hasImports) {
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
      }

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

export const compareOutputs = (actual: any, expected: any): boolean => {
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

export interface ConstraintResult {
  type: CodeConstraintType;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  value?: number | string[] | boolean;
}
