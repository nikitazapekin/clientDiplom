/* eslint-disable */

import type { CodeLanguage } from "@/app/http/codeService";

import type {
  ArgumentSchema,
  ArgumentType,
  CodeTaskTestCase,
  CodeConstraintType,
  ObjectField,
  ReturnObjectMode,
  ReturnSchema,
  TestCaseArgument,
} from "./types";
import {
  CSHARP_TYPED_SERIALIZATION_HELPERS,
  GO_TYPED_SERIALIZATION_HELPERS,
  JAVA_SERIALIZATION_HELPERS,
  JS_TYPED_SERIALIZATION_HELPERS,
  PHP_TYPED_SERIALIZATION_HELPERS,
  PYTHON_TYPED_SERIALIZATION_HELPERS,
  RUBY_TYPED_SERIALIZATION_HELPERS,
  RUST_TYPED_SERIALIZATION_HELPERS,
} from "./resultSerialization";
import {
  compareOutputsWithType,
  type CompareOutputsOptions,
} from "./typedOutputComparison";

export type { CompareOutputsOptions };

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

  const mainMethodBody = `
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
            System.out.print(__codexSerializeResult(result));
            System.out.println("===RESULT_END===");
            
        } catch (Exception e) {
            System.setOut(originalOut);
            System.out.println("===RESULT_START===");
            System.out.print("{\\"error\\":" + __codexSerializeError(e) + "}");
            System.out.println("===RESULT_END===");
        }
`;

  return injectJavaRunner(code, mainMethodBody);
};

export const parseArguments = (input: string): any[] => {
  if (!input.trim()) return [];

  try {
    if (input.trim().startsWith("[") && input.trim().endsWith("]")) {
      return JSON.parse(input);
    }
  } catch {}

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
  } catch {}

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

const DEFAULT_FUNCTION_NAME_BY_LANGUAGE: Record<CodeLanguage, string> = {
  javascript: "yourFunction",
  typescript: "yourFunction",
  python: "your_function",
  php: "yourFunction",
  ruby: "your_function",
  rust: "your_function",
  csharp: "YourFunction",
  java: "yourFunction",
  golang: "yourFunction",
  cpp: "yourFunction",
};

export const getStarterFunctionName = (
  language: CodeLanguage,
  functionName?: string | null
): string => {
  const normalizedFunctionName = functionName?.trim();

  if (normalizedFunctionName) {
    return normalizedFunctionName;
  }

  return DEFAULT_FUNCTION_NAME_BY_LANGUAGE[language] ?? "yourFunction";
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
  const typeMap: Record<ArgumentType, Partial<Record<CodeLanguage, string>>> = {
    int: {
      javascript: "",
      typescript: "number",
      python: "int",
      php: "int",
      ruby: "",
      rust: "i32",
      csharp: "int",
      java: "int",
      golang: "int",
      cpp: "int",
    },
    string: {
      javascript: "",
      typescript: "string",
      python: "str",
      php: "string",
      ruby: "",
      rust: "String",
      csharp: "string",
      java: "String",
      golang: "string",
      cpp: "string",
    },
    number: {
      javascript: "number",
      typescript: "number",
      python: "float",
      php: "float",
      ruby: "",
      rust: "f64",
      csharp: "double",
      java: "double",
      golang: "float64",
      cpp: "double",
    },
    boolean: {
      javascript: "",
      typescript: "boolean",
      python: "bool",
      php: "bool",
      ruby: "",
      rust: "bool",
      csharp: "bool",
      java: "boolean",
      golang: "bool",
      cpp: "bool",
    },
    double: {
      javascript: "",
      typescript: "number",
      python: "float",
      php: "float",
      ruby: "",
      rust: "f64",
      csharp: "double",
      java: "double",
      golang: "float64",
      cpp: "double",
    },
    float: {
      javascript: "",
      typescript: "number",
      python: "float",
      php: "float",
      ruby: "",
      rust: "f32",
      csharp: "float",
      java: "float",
      golang: "float32",
      cpp: "float",
    },
    long: {
      javascript: "",
      typescript: "number",
      python: "int",
      php: "int",
      ruby: "",
      rust: "i64",
      csharp: "long",
      java: "long",
      golang: "int64",
      cpp: "long",
    },
    char: {
      javascript: "",
      typescript: "string",
      python: "str",
      php: "string",
      ruby: "",
      rust: "char",
      csharp: "char",
      java: "char",
      golang: "rune",
      cpp: "char",
    },
    byte: {
      javascript: "",
      typescript: "number",
      python: "bytes",
      php: "int",
      ruby: "",
      rust: "u8",
      csharp: "byte",
      java: "byte",
      golang: "byte",
      cpp: "short",
    },
    short: {
      javascript: "",
      typescript: "number",
      python: "int",
      php: "int",
      ruby: "",
      rust: "i16",
      csharp: "short",
      java: "short",
      golang: "int16",
      cpp: "short",
    },
    object: {
      javascript: "",
      typescript: "Record<string, unknown>",
      python: "",
      php: "array",
      ruby: "",
      rust: "std::collections::HashMap<String, String>",
      csharp: "object",
      java: "Object",
      golang: "interface{}",
      cpp: "map<string, string>",
    },
    array: {
      javascript: "",
      typescript: "number[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<i32>",
      csharp: "object",
      java: "int[]",
      golang: "[]int",
      cpp: "vector<int>",
    },
    array_int: {
      javascript: "",
      typescript: "number[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<i32>",
      csharp: "int[]",
      java: "int[]",
      golang: "[]int",
      cpp: "vector<int>",
    },
    array_string: {
      javascript: "",
      typescript: "string[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<String>",
      csharp: "string[]",
      java: "String[]",
      golang: "[]string",
      cpp: "vector<string>",
    },
    array_double: {
      javascript: "",
      typescript: "number[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<f64>",
      csharp: "double[]",
      java: "double[]",
      golang: "[]float64",
      cpp: "vector<double>",
    },
    array_float: {
      javascript: "",
      typescript: "number[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<f32>",
      csharp: "float[]",
      java: "float[]",
      golang: "[]float32",
      cpp: "vector<float>",
    },
    array_long: {
      javascript: "",
      typescript: "number[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<i64>",
      csharp: "long[]",
      java: "long[]",
      golang: "[]int64",
      cpp: "vector<long>",
    },
    array_boolean: {
      javascript: "",
      typescript: "boolean[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<bool>",
      csharp: "bool[]",
      java: "boolean[]",
      golang: "[]bool",
      cpp: "vector<bool>",
    },
    array_char: {
      javascript: "",
      typescript: "string[]",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<char>",
      csharp: "char[]",
      java: "char[]",
      golang: "[]rune",
      cpp: "vector<char>",
    },
    list: {
      javascript: "",
      typescript: "Array<unknown>",
      python: "list",
      php: "array",
      ruby: "",
      rust: "Vec<String>",
      csharp: "List<object>",
      java: "List<Object>",
      golang: "[]interface{}",
      cpp: "vector<int>",
    },
    map: {
      javascript: "Object",
      typescript: "Record<string, unknown>",
      python: "dict",
      php: "array",
      ruby: "",
      rust: "std::collections::HashMap<String, String>",
      csharp: "Dictionary<string, object>",
      java: "Map<String, Object>",
      golang: "map[string]interface{}",
      cpp: "map<string, string>",
    },
    void: {
      javascript: "void",
      typescript: "void",
      python: "None",
      php: "void",
      ruby: "",
      rust: "()",
      csharp: "void",
      java: "void",
      golang: "",
      cpp: "void",
    },
  };

  return typeMap[type_]?.[language] ?? type_;
};

const getDefaultClassName = (name: string | undefined, fallback: string): string => {
  const trimmedName = name?.trim();
  return trimmedName ? trimmedName : fallback;
};

const getJavaCollectionElementTypeString = (
  type_: ArgumentType,
  objectClassName?: string
): string => {
  if (type_ === "object") {
    return objectClassName || "Object";
  }

  const boxedTypeMap: Partial<Record<ArgumentType, string>> = {
    int: "Integer",
    boolean: "Boolean",
    double: "Double",
    float: "Float",
    long: "Long",
    char: "Character",
    byte: "Byte",
    short: "Short",
    string: "String",
  };

  return boxedTypeMap[type_] ?? getTypeString(type_, "java");
};

const getCollectionElementTypeString = (
  type_: ArgumentType,
  language: CodeLanguage,
  objectClassName?: string
): string => {
  if (language === "java") {
    return getJavaCollectionElementTypeString(type_, objectClassName);
  }

  if (
    type_ === "object" &&
    objectClassName &&
    (language === "csharp" || language === "typescript")
  ) {
    return objectClassName;
  }

  return getTypeString(type_, language);
};

const getReturnClassName = (returnSchema?: ReturnSchema): string => {
  return getDefaultClassName(returnSchema?.className, "Result");
};

const getReturnArrayElementClassName = (returnSchema?: ReturnSchema): string => {
  return getDefaultClassName(returnSchema?.arrayElementClassName, "ResultItem");
};

export const getEffectiveReturnObjectMode = (returnSchema?: ReturnSchema): ReturnObjectMode => {
  if (returnSchema?.objectReturnMode) {
    return returnSchema.objectReturnMode;
  }

  if (returnSchema?.className || (returnSchema?.objectFields?.length ?? 0) > 0) {
    return "concrete";
  }

  return "generic";
};

export const getReturnTypeString = (
  type_: ArgumentType,
  language: CodeLanguage,
  returnSchema?: ReturnSchema,
  preferSchemaClassName = false
): string => {
  if (type_ === "void") {
    if (language === "rust") {
      return "()";
    }
    return language === "python" || language === "golang" || language === "ruby" ? "" : "void";
  }
  if (type_ === "object") {
    const objectReturnMode = getEffectiveReturnObjectMode(returnSchema);
    if (
      preferSchemaClassName &&
      objectReturnMode === "concrete" &&
      (language === "java" || language === "csharp" || language === "typescript") &&
      (returnSchema?.className || returnSchema?.objectFields)
    ) {
      return getReturnClassName(returnSchema);
    }
    if (language === "java") return "Object";
    if (language === "golang") return "interface{}";
    if (language === "typescript") return "Record<string, unknown>";
    if (language === "php") return "array";
    if (language === "rust") return "std::collections::HashMap<String, String>";
    if (language === "cpp") return "map<string, string>";
    if (language === "ruby" || language === "python" || language === "javascript") return "";
    return "object";
  }
  if (type_ === "array") {
    const elementType = returnSchema?.arrayElementType ?? "int";
    const objectClassName =
      elementType === "object" &&
      (returnSchema?.arrayElementObjectFields || returnSchema?.arrayElementClassName)
        ? getReturnArrayElementClassName(returnSchema)
        : undefined;

    if (elementType === "object") {
      if (preferSchemaClassName && objectClassName) {
        return language === "csharp"
          ? `${objectClassName}[]`
          : language === "java"
            ? `${objectClassName}[]`
            : language === "typescript"
              ? `${objectClassName}[]`
              : language === "golang"
                ? "[]interface{}"
                : language === "rust"
                  ? "Vec<std::collections::HashMap<String, String>>"
                  : language === "cpp"
                    ? "vector<map<string, string>>"
                    : language === "php"
                      ? "array"
                      : "";
      }

      return language === "csharp"
        ? "object[]"
        : language === "java"
          ? "Object[]"
          : language === "typescript"
            ? "Array<Record<string, unknown>>"
            : language === "golang"
              ? "[]interface{}"
              : language === "rust"
                ? "Vec<std::collections::HashMap<String, String>>"
                : language === "cpp"
                  ? "vector<map<string, string>>"
                  : language === "php"
                    ? "array"
                    : "";
    }

    return language === "csharp"
      ? `${getCollectionElementTypeString(elementType, "csharp", objectClassName)}[]`
      : language === "java"
        ? `${getCollectionElementTypeString(elementType, "java", objectClassName)}[]`
        : language === "typescript"
          ? `${getCollectionElementTypeString(elementType, "typescript", objectClassName)}[]`
          : language === "golang"
            ? `[]${getCollectionElementTypeString(elementType, "golang", objectClassName)}`
            : language === "rust"
              ? `Vec<${getCollectionElementTypeString(elementType, "rust", objectClassName)}>`
              : language === "cpp"
                ? `vector<${getCollectionElementTypeString(elementType, "cpp", objectClassName)}>`
                : language === "php"
                  ? "array"
                  : language === "ruby" || language === "python" || language === "javascript"
                    ? ""
                    : "object";
  }
  if (type_ === "list") {
    const elementType = returnSchema?.arrayElementType ?? "object";
    const objectClassName =
      elementType === "object" &&
      (returnSchema?.arrayElementObjectFields || returnSchema?.arrayElementClassName)
        ? getReturnArrayElementClassName(returnSchema)
        : undefined;

    if (elementType === "object") {
      if (preferSchemaClassName && objectClassName) {
        return language === "csharp"
          ? `List<${objectClassName}>`
          : language === "java"
            ? `List<${objectClassName}>`
            : language === "golang"
              ? "[]interface{}"
              : language === "typescript"
                ? "Array<Record<string, unknown>>"
                : language === "php"
                  ? "array"
                  : language === "rust"
                    ? "Vec<std::collections::HashMap<String, String>>"
                    : "object";
      }
      return language === "csharp"
        ? "System.Collections.IEnumerable"
        : language === "java"
          ? "List<?>"
          : language === "golang"
            ? "[]interface{}"
            : language === "typescript"
              ? "Array<Record<string, unknown>>"
              : language === "php"
                ? "array"
                : language === "rust"
                  ? "Vec<std::collections::HashMap<String, String>>"
                  : "object";
    }

    return language === "csharp"
      ? `List<${getCollectionElementTypeString(elementType, "csharp", objectClassName)}>`
      : language === "java"
        ? `List<${getCollectionElementTypeString(elementType, "java", objectClassName)}>`
        : language === "golang"
          ? "[]interface{}"
          : language === "typescript"
            ? `${getCollectionElementTypeString(elementType, "typescript", objectClassName)}[]`
            : language === "php"
              ? "array"
              : language === "rust"
                ? `Vec<${getCollectionElementTypeString(elementType, "rust", objectClassName)}>`
                : language === "ruby"
                  ? ""
                  : "object";
  }
  return getTypeString(type_, language);
};

export const getDefaultReturnValue = (type_: ArgumentType, language?: CodeLanguage): string => {
  const isPython = language === "python";
  const isGo = language === "golang";
  const isRuby = language === "ruby";
  const isPhp = language === "php";
  const isRust = language === "rust";
  const isTypeScript = language === "typescript";
  const isCpp = language === "cpp";

  switch (type_) {
    case "number":
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
      if (isRuby) return "return nil";
      if (isPhp) return "return 0;";
      if (isRust) return "return 0;";
      if (isTypeScript) return "return 0;";
      if (isCpp) return "return 0;";
      return "return null;";
    case "string":
      if (isPython || isGo) return 'return ""';
      if (isRuby) return 'return ""';
      if (isPhp) return 'return "";';
      if (isRust) return "return String::new();";
      if (isTypeScript) return 'return "";';
      if (isCpp) return 'return "";';
      return 'return "";';
    case "boolean":
    case "array_boolean":
      if (isPython) return "return False";
      if (isGo) return "return false";
      if (isRuby) return "return false";
      if (isPhp) return "return false;";
      if (isRust) return "return false;";
      if (isTypeScript) return "return false;";
      if (isCpp) return "return false;";
      return "return false;";
    case "char":
      if (isPython) return 'return ""';
      if (isGo) return "return ''";
      if (isRuby) return 'return ""';
      if (isPhp) return 'return "a";';
      if (isRust) return "return 'a';";
      if (isTypeScript) return 'return "a";';
      if (isCpp) return "return 'a';";
      return "return 'a';";
    case "object":
      if (isRust) return "return std::collections::HashMap::new();";
      if (isRuby) return "return {}";
      if (isPhp) return "return [];";
      if (isTypeScript) return "return {};";
      if (isPython) return "return None";
      if (isGo) return "return nil";
      if (isCpp) return "return {};";
      return "return null;";
    case "array":
    case "array_string":
    case "list":
      if (isPython) return "return None";
      if (isGo) return "return nil";
      if (isRuby) return "return []";
      if (isPhp) return "return [];";
      if (isRust) return "return vec![];";
      if (isTypeScript) return "return [];";
      if (isCpp) return "return {};";
      return "return null;";
    case "map":
      if (isPython) return "return None";
      if (isGo) return "return nil";
      if (isRuby) return "return {}";
      if (isPhp) return "return [];";
      if (isRust) return "return std::collections::HashMap::new();";
      if (isTypeScript) return "return {};";
      if (isCpp) return "return {};";
      return "return null;";
    case "void":
      if (isRust) return "return;";
      return "";
    default:
      if (isPython) return "return None";
      if (isGo) return "return nil";
      if (isRuby) return "return nil";
      if (isPhp) return "return null;";
      if (isRust) return "return Default::default();";
      if (isTypeScript) return "return null;";
      return "return null;";
  }
};

const parseStructuredFieldValue = (rawValue: string, type_: ArgumentType): unknown => {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === "null") return null;

  switch (type_) {
    case "string":
    case "char":
      return rawValue;
    case "boolean":
      return trimmedValue.toLowerCase() === "true";
    case "int":
    case "double":
    case "float":
    case "long":
    case "short":
    case "byte":
    case "number":
      return Number(trimmedValue);
    default:
      return rawValue;
  }
};

export const buildExpectedObjectOutput = (
  expectedObjectValues: Record<string, string> | undefined,
  returnSchema?: ReturnSchema
): string => {
  if (!returnSchema?.objectFields || returnSchema.objectFields.length === 0) {
    return "";
  }

  const values = expectedObjectValues ?? {};
  const output: Record<string, unknown> = {};

  returnSchema.objectFields.forEach((field) => {
    const rawValue = values[field.name] ?? "";
    if (rawValue.trim() === "") {
      return;
    }

    output[field.name] = parseStructuredFieldValue(rawValue, field.type);
  });

  return Object.keys(output).length > 0 ? JSON.stringify(output) : "";
};

export const getExpectedOutputFromTestCase = (
  testCase: CodeTaskTestCase,
  returnType: ArgumentType | undefined,
  returnSchema?: ReturnSchema
): string => {
  if (returnType === "object" && returnSchema?.objectFields) {
    return (
      buildExpectedObjectOutput(testCase.expectedObjectValues, returnSchema) ||
      testCase.expectedOutput ||
      ""
    );
  }

  return testCase.expectedOutput ?? "";
};

export const getArrayTypeString = (scheme: ArgumentSchema, language: CodeLanguage): string => {
  const elementType = scheme.arrayElementType ?? "int";

  if (scheme.arrayElementObjectFields && scheme.arrayElementObjectFields.length > 0) {
    const className =
      scheme.arrayElementClassName || scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1);
    if (language === "java" || language === "csharp") {
      return `${className}[]`;
    }
    if (language === "typescript") {
      return `${className}[]`;
    }
    if (language === "cpp") {
      return "vector<map<string, string>>";
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
  if (language === "typescript") {
    return `${getTypeString(elementType, "typescript")}[]`;
  }
  if (language === "rust") {
    return `Vec<${getTypeString(elementType, "rust")}>`;
  }
  if (language === "cpp") {
    return `vector<${getTypeString(elementType, "cpp")}>`;
  }
  return "array";
};

export const getListTypeString = (scheme: ArgumentSchema, language: CodeLanguage): string => {
  const elementType = scheme.arrayElementType ?? "int";
  const objectClassName =
    elementType === "object" && scheme.arrayElementObjectFields
      ? getDefaultClassName(
          scheme.arrayElementClassName,
          scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1)
        )
      : undefined;

  if (language === "java") {
    return `List<${getCollectionElementTypeString(elementType, "java", objectClassName)}>`;
  }
  if (language === "csharp") {
    return `List<${getCollectionElementTypeString(elementType, "csharp", objectClassName)}>`;
  }
  if (language === "typescript") {
    return `Array<${getCollectionElementTypeString(elementType, "typescript", objectClassName)}>`;
  }
  if (language === "rust") {
    return `Vec<${getCollectionElementTypeString(elementType, "rust", objectClassName)}>`;
  }
  if (language === "golang") {
    return `[]${getCollectionElementTypeString(elementType, "golang", objectClassName)}`;
  }
  if (language === "cpp") {
    return `vector<${getCollectionElementTypeString(elementType, "cpp", objectClassName)}>`;
  }
  return "List";
};

export const getDefaultStarterCode = (
  language: CodeLanguage,
  args: ArgumentSchema[] = [],
  returnType: ArgumentType = "int",
  returnSchema?: ReturnSchema,
  functionName?: string | null
): string => {
  const argsStr = args
    .map((arg) => {
      let typeStr: string;
      if (arg.type === "array") {
        typeStr = getArrayTypeString(arg, language);
      } else if (arg.type === "list") {
        typeStr = getListTypeString(arg, language);
      } else if (
        arg.type === "object" &&
        arg.className &&
        (language === "java" || language === "csharp" || language === "typescript")
      ) {
        typeStr = arg.className;
      } else {
        typeStr = getTypeString(arg.type, language);
      }
      return `${typeStr} ${arg.name}`;
    })
    .join(", ");

  const retTypeStr = getReturnTypeString(returnType, language, returnSchema, true);
  const returnValue = getDefaultReturnValue(returnType, language);
  const hasListTypes = args.some((arg) => arg.type === "list") || returnType === "list";
  const starterFunctionName = getStarterFunctionName(language, functionName);

  switch (language) {
    case "csharp":
      return `${hasListTypes ? "using System.Collections.Generic;\n" : ""}using System;

public class Program
{
    public static ${retTypeStr} ${starterFunctionName}(${argsStr})
    {
        // Ваш код здесь
        Console.WriteLine("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""});
        ${returnValue}
    }
}`;
    case "java":
      return `${hasListTypes ? "import java.util.List;\n\n" : ""}public class Main {
    public static ${retTypeStr} ${starterFunctionName}(${argsStr}) {
        // Ваш код здесь
        System.out.println("HELLO"${args.length > 0 ? ` + " " + ${args.map((a) => a.name).join(' + " " + ')}` : ""});
        ${returnValue}
    }
}`;
    case "python": {
      const pythonArgs = args.map((a) => a.name).join(", ");
      return `def ${starterFunctionName}(${pythonArgs}):
    # Ваш код здесь
    print("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""})
    ${returnValue}`;
    }
    case "typescript": {
      const tsArgs = args
        .map((arg) => {
          let typeStr: string;
          if (arg.type === "array") {
            typeStr = getArrayTypeString(arg, "typescript");
          } else if (arg.type === "list") {
            typeStr = getListTypeString(arg, "typescript");
          } else if (arg.type === "object" && arg.className) {
            typeStr = arg.className;
          } else {
            typeStr = getTypeString(arg.type, "typescript") || "unknown";
          }
          return `${arg.name}: ${typeStr}`;
        })
        .join(", ");
      return `function ${starterFunctionName}(${tsArgs})${retTypeStr ? `: ${retTypeStr}` : ""} {
    // Ваш код здесь
    console.log("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""});
    ${returnValue}
}`;
    }
    case "php": {
      const phpArgs = args.map((arg) => `$${arg.name}`).join(", ");
      return `<?php

function ${starterFunctionName}(${phpArgs})${retTypeStr ? `: ${retTypeStr}` : ""} {
    // Ваш код здесь
    echo "HELLO";
    ${returnValue}
}`;
    }
    case "ruby": {
      const rubyArgs = args.map((arg) => arg.name).join(", ");
      return `def ${starterFunctionName}(${rubyArgs})
  # Ваш код здесь
  puts("HELLO")
  ${returnValue}
end`;
    }
    case "rust": {
      const rustArgs = args
        .map(
          (arg) =>
            `${arg.name}: ${arg.type === "array" ? getArrayTypeString(arg, "rust") : arg.type === "list" ? getListTypeString(arg, "rust") : getTypeString(arg.type, "rust")}`
        )
        .join(", ");
      const rustReturnType = getReturnTypeString(returnType, "rust", returnSchema, true);
      const needsHashMap =
        args.some((arg) => arg.type === "object" || arg.type === "map") ||
        returnType === "object" ||
        returnType === "map";

      return `${needsHashMap ? "use std::collections::HashMap;\n\n" : ""}fn ${starterFunctionName}(${rustArgs})${rustReturnType ? ` -> ${rustReturnType}` : ""} {
    // Ваш код здесь
    println!("HELLO");
    ${returnValue}
}`;
    }
    case "golang": {
      const goArgsStr = args
        .map((arg) => {
          if (arg.type === "array") {
            return `${arg.name} ${getArrayTypeString(arg, "golang")}`;
          }
          if (arg.type === "list") {
            return `${arg.name} ${getListTypeString(arg, "golang")}`;
          }
          return `${arg.name} ${getTypeString(arg.type, "golang")}`;
        })
        .join(", ");
      const goRetStr = getReturnTypeString(returnType, "golang", returnSchema, true);

      return `package main

import "fmt"

func ${starterFunctionName}(${goArgsStr}) ${goRetStr} {
    // Ваш код здесь
    fmt.Println("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""})
    ${returnValue}
}`;
    }
    case "cpp": {
      const cppArgs = args
        .map((arg) => {
          if (arg.type === "array") {
            return `${getArrayTypeString(arg, "cpp")} ${arg.name}`;
          }
          if (arg.type === "list") {
            return `${getListTypeString(arg, "cpp")} ${arg.name}`;
          }
          return `${getTypeString(arg.type, "cpp")} ${arg.name}`;
        })
        .join(", ");
      const cppRetStr = getReturnTypeString(returnType, "cpp", returnSchema, true) || "void";

      return `#include <iostream>
#include <map>
#include <string>
#include <vector>

using namespace std;

${cppRetStr} ${starterFunctionName}(${cppArgs}) {
    // Ваш код здесь
    cout << "HELLO";
    ${returnValue}
}`;
    }
    default: {
      const jsArgs = args.map((a) => a.name).join(", ");
      return `function ${starterFunctionName}(${jsArgs}) {
    // Ваш код здесь
    console.log("HELLO"${args.length > 0 ? `, ${args.map((a) => a.name).join(", ")}` : ""});
    ${returnValue}
}`;
    }
  }
};

type GeneratedClassSchema = {
  className: string;
  fields: ObjectField[];
};

const getGeneratedClassSchemas = (
  args: ArgumentSchema[],
  returnSchema?: ReturnSchema
): GeneratedClassSchema[] => {
  const classSchemas: GeneratedClassSchema[] = [];
  const seenClassNames = new Set<string>();

  const pushClass = (className: string, fields?: ObjectField[]) => {
    if (!fields) return;
    if (seenClassNames.has(className)) return;
    seenClassNames.add(className);
    classSchemas.push({ className, fields });
  };

  args.forEach((arg) => {
    if (arg.type === "object" && arg.objectFields) {
      pushClass(
        getDefaultClassName(arg.className, arg.name.charAt(0).toUpperCase() + arg.name.slice(1)),
        arg.objectFields
      );
    }

    if (
      (arg.type === "array" || arg.type === "list") &&
      arg.arrayElementType === "object" &&
      arg.arrayElementObjectFields
    ) {
      pushClass(
        getDefaultClassName(
          arg.arrayElementClassName,
          arg.name.charAt(0).toUpperCase() + arg.name.slice(1)
        ),
        arg.arrayElementObjectFields
      );
    }
  });

  if (
    returnSchema?.objectFields &&
    (getEffectiveReturnObjectMode(returnSchema) === "concrete" || returnSchema.className)
  ) {
    pushClass(getReturnClassName(returnSchema), returnSchema.objectFields);
  }

  if (returnSchema?.arrayElementType === "object" && returnSchema.arrayElementObjectFields) {
    pushClass(getReturnArrayElementClassName(returnSchema), returnSchema.arrayElementObjectFields);
  }

  return classSchemas;
};

export const generateObjectClasses = (
  args: ArgumentSchema[],
  language: CodeLanguage,
  returnSchema?: ReturnSchema
): string => {
  const allClasses = getGeneratedClassSchemas(args, returnSchema);

  if (allClasses.length === 0) return "";

  return allClasses
    .map(({ className, fields: objectFields }) => {
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
      if (language === "typescript") {
        const constructorParams = objectFields
          .map((f) => `public ${f.name}: ${getTypeString(f.type, language) || "unknown"}`)
          .join(", ");
        return objectFields.length > 0
          ? `
class ${className} {
    constructor(${constructorParams}) {}
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

const buildJavaRunnerCode = (mainBody: string): string => {
  return `${JAVA_SERIALIZATION_HELPERS}

    public static void main(String[] args) {
${mainBody}
    }`;
};

const injectJavaRunner = (userCode: string, mainBody: string): string => {
  const runnerCode = buildJavaRunnerCode(mainBody);

  if (userCode.includes("public static void main")) {
    return userCode.replace(
      /public\s+static\s+void\s+main\(String\[\]\s*args\)\s*\{[\s\S]*?\}/,
      runnerCode
    );
  }

  const trimmedCode = userCode.trim();
  const mainClassEnd = trimmedCode.lastIndexOf("}");
  const codeWithoutMainBrace =
    mainClassEnd > 0 ? trimmedCode.substring(0, mainClassEnd) : trimmedCode.replace(/\}\s*$/, "");

  return `${codeWithoutMainBrace}
${runnerCode}
}`;
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
                Console.WriteLine(System.Text.Json.__CodexRuntime.SerializeTyped(result));
                Console.WriteLine("===RESULT_END_" + ${testNum} + "===");
                
            } catch (Exception e) {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Console.WriteLine("===RESULT_START_" + ${testNum} + "===");
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { error = e.Message }, jsonOptions));
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
        var jsonOptions = new JsonSerializerOptions { IncludeFields = true };
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
                System.out.print(__codexSerializeResult(result));
                System.out.println("===RESULT_END_" + ${index + 1} + "===");
                
            } catch (Exception e) {
                System.setOut(originalOut);
                System.out.println("===RESULT_START_" + ${index + 1} + "===");
                System.out.print("{\\"error\\":" + __codexSerializeError(e) + "}");
                System.out.println("===RESULT_END_" + ${index + 1} + "===");
            }
        }`;
    })
    .join("\n");

  return injectJavaRunner(userCode, testCasesCode);
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
                System.out.print(__codexSerializeResult(result));
                System.out.println();
                System.out.println("===RESULT_END_" + ${testNum} + "===");
                
            } catch (Exception e) {
                System.setOut(originalOut);
                System.out.println("===RESULT_START_" + ${testNum} + "===");
                System.out.print("{\\"error\\":" + __codexSerializeError(e) + "}");
                System.out.println();
                System.out.println("===RESULT_END_" + ${testNum} + "===");
            }
        }`;
    })
    .join("\n");

  return injectJavaRunner(userCode, testCasesCode);
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
          } catch {}
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
          } catch {}
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
          } catch {}
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
          } catch {}
        }
      }

      return arg.value;
    })
    .filter(Boolean);

  return args.join(", ");
};

const cleanQuotedValue = (val: string) => {
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
};

const escapeDoubleQuotedString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const escapeSingleQuotedString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const formatDynamicBoolean = (value: string, language: CodeLanguage) => {
  if (language === "python") {
    return value.toLowerCase() === "true" ? "True" : "False";
  }
  return value.toLowerCase() === "true" ? "true" : "false";
};

const formatDynamicScalar = (
  rawValue: string,
  type_: ArgumentType,
  language: CodeLanguage
): string => {
  const cleanValue = cleanQuotedValue(rawValue);

  if (type_ === "string" || type_ === "char") {
    return `"${escapeDoubleQuotedString(cleanValue)}"`;
  }

  if (type_ === "boolean") {
    return formatDynamicBoolean(cleanValue, language);
  }

  return cleanValue;
};

const parseJsonIfPossible = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getSamplePrimitiveValue = (type_: ArgumentType): string | number | boolean => {
  switch (type_) {
    case "string":
      return "sample";
    case "char":
      return "a";
    case "boolean":
      return true;
    case "number":
    case "double":
    case "float":
      return 12.5;
    default:
      return 12;
  }
};

const buildSampleObjectValues = (fields?: ObjectField[]): Record<string, string> =>
  Object.fromEntries(
    (fields ?? []).map((field) => [field.name, String(getSamplePrimitiveValue(field.type))])
  );

const buildSampleTestCaseArgs = (argumentScheme: ArgumentSchema[]): TestCaseArgument[] =>
  argumentScheme.map((scheme, index) => {
    if (scheme.type === "object" || scheme.type === "map") {
      return {
        index,
        value: "{}",
        objectValues: buildSampleObjectValues(scheme.objectFields),
      };
    }

    if (scheme.type.startsWith("array_")) {
      const elementType = scheme.type.replace("array_", "") as ArgumentType;
      return {
        index,
        value: JSON.stringify([getSamplePrimitiveValue(elementType)]),
      };
    }

    if (scheme.type === "array" || scheme.type === "list") {
      if (scheme.arrayElementObjectFields?.length) {
        return {
          index,
          value: "[]",
        };
      }

      return {
        index,
        value: JSON.stringify([getSamplePrimitiveValue(scheme.arrayElementType ?? "int")]),
      };
    }

    return {
      index,
      value: String(getSamplePrimitiveValue(scheme.type)),
    };
  });

const formatDynamicObjectLiteral = (
  entries: Array<[string, string]>,
  language: CodeLanguage
): string => {
  if (language === "php") {
    return `[${entries
      .map(([key, value]) => `"${escapeDoubleQuotedString(key)}" => ${value}`)
      .join(", ")}]`;
  }

  if (language === "python") {
    return `{${entries
      .map(([key, value]) => `"${escapeDoubleQuotedString(key)}": ${value}`)
      .join(", ")}}`;
  }

  if (language === "ruby") {
    return `{ ${entries
      .map(([key, value]) => `"${escapeDoubleQuotedString(key)}" => ${value}`)
      .join(", ")} }`;
  }

  return `{ ${entries.map(([key, value]) => `${key}: ${value}`).join(", ")} }`;
};

export const formatArgsForDynamicLang = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[],
  language: CodeLanguage
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  const args = testCaseArgs
    .map((arg, idx) => {
      const scheme = argumentScheme[idx];
      if (!scheme) return null;

      const cleanVal = cleanQuotedValue(arg.value);

      if (scheme.type === "string") return `"${escapeDoubleQuotedString(cleanVal)}"`;
      if (scheme.type === "number") return cleanVal;
      if (scheme.type === "char") return `"${escapeDoubleQuotedString(cleanVal)}"`;
      if (scheme.type === "boolean") {
        return formatDynamicBoolean(cleanVal, language);
      }
      if (scheme.type === "object") {
        if (scheme.objectFields?.length) {
          return formatDynamicObjectLiteral(
            scheme.objectFields.map((field) => [
              field.name,
              formatDynamicScalar(arg.objectValues?.[field.name] ?? "", field.type, language),
            ]),
            language
          );
        }

        if (arg.value?.trim().startsWith("{")) {
          const parsedValue = parseJsonIfPossible(arg.value);
          if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
            return formatDynamicObjectLiteral(
              Object.entries(parsedValue as Record<string, unknown>).map(([key, value]) => [
                key,
                typeof value === "string"
                  ? `"${escapeDoubleQuotedString(value)}"`
                  : typeof value === "boolean"
                    ? language === "python"
                      ? value
                        ? "True"
                        : "False"
                      : value
                        ? "true"
                        : "false"
                    : Array.isArray(value)
                      ? `[${value.map((item) => JSON.stringify(item)).join(", ")}]`
                      : String(value),
              ]),
              language
            );
          }
        }

        return language === "php" ? "[]" : "{}";
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
          } catch {}
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
            const entries = objFields.map((f) => [
              f.name,
              formatDynamicScalar(
                cleanQuotedValue((val as unknown as Record<string, string>)?.[f.name] ?? ""),
                f.type,
                language
              ),
            ]) as Array<[string, string]>;

            if (
              language === "javascript" ||
              language === "typescript" ||
              language === "python" ||
              language === "php" ||
              language === "ruby"
            ) {
              return formatDynamicObjectLiteral(entries, language);
            }

            return `${className}(${entries.map(([, entryValue]) => entryValue).join(", ")})`;
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
          } catch {}
        }
        return arg.value;
      }

      return arg.value;
    })
    .filter(Boolean);

  return args.join(", ");
};

export const getSampleArgsForLanguage = (
  language: CodeLanguage,
  argumentScheme: ArgumentSchema[]
): string => {
  if (!argumentScheme.length) return "";

  const sampleArgs = buildSampleTestCaseArgs(argumentScheme);

  if (language === "java" || language === "csharp") {
    return formatArgsForJavaOrCSharp(sampleArgs, argumentScheme, language);
  }

  if (
    language === "javascript" ||
    language === "typescript" ||
    language === "python" ||
    language === "php" ||
    language === "ruby"
  ) {
    return formatArgsForDynamicLang(sampleArgs, argumentScheme, language);
  }

  if (language === "golang") {
    return formatArgsForGolang(sampleArgs, argumentScheme);
  }

  if (language === "rust") {
    return formatArgsForRust(sampleArgs, argumentScheme);
  }

  return sampleArgs.map((arg) => arg.value).join(", ");
};

const formatGoPrimitive = (rawValue: string, type_: ArgumentType): string => {
  const cleanValue = cleanQuotedValue(rawValue);

  switch (type_) {
    case "string":
      return `"${escapeDoubleQuotedString(cleanValue)}"`;
    case "char":
      return `'${escapeSingleQuotedString(cleanValue)}'`;
    case "boolean":
      return cleanValue.toLowerCase() === "true" ? "true" : "false";
    default:
      return cleanValue;
  }
};

const formatGoObjectLiteral = (
  values: Record<string, string>,
  objectFields?: ObjectField[]
): string => {
  const sourceEntries =
    objectFields?.map(
      (field) =>
        [field.name, formatGoPrimitive(values[field.name] ?? "", field.type)] as [string, string]
    ) ??
    Object.entries(values).map(([key, value]) => [
      key,
      `"${escapeDoubleQuotedString(cleanQuotedValue(value))}"`,
    ]);

  return `map[string]interface{}{${sourceEntries
    .map(([key, value]) => `"${escapeDoubleQuotedString(key)}": ${value}`)
    .join(", ")}}`;
};

export const formatArgsForGolang = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[]
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  const args = testCaseArgs
    .map((arg, idx) => {
      const scheme = argumentScheme[idx];
      if (!scheme) return null;

      if (scheme.type === "object" || scheme.type === "map") {
        if (arg.objectValues && Object.keys(arg.objectValues).length > 0) {
          return formatGoObjectLiteral(arg.objectValues, scheme.objectFields);
        }

        const parsedValue = parseJsonIfPossible(arg.value);
        if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
          return formatGoObjectLiteral(
            Object.fromEntries(
              Object.entries(parsedValue as Record<string, unknown>).map(([key, value]) => [
                key,
                String(value),
              ])
            ),
            scheme.objectFields
          );
        }

        return "map[string]interface{}{}";
      }

      if (scheme.type && scheme.type.startsWith("array_")) {
        const elementType = scheme.type.replace("array_", "") as ArgumentType;
        const parsedValue = parseJsonIfPossible(arg.value);
        if (Array.isArray(parsedValue)) {
          return `[]${getTypeString(elementType, "golang")}{${parsedValue
            .map((item) => formatGoPrimitive(String(item), elementType))
            .join(", ")}}`;
        }
        return `[]${getTypeString(elementType, "golang")}{}`;
      }

      if (scheme.type === "array" || scheme.type === "list") {
        const elementType = scheme.arrayElementType ?? "int";

        if (scheme.arrayElementObjectFields) {
          const elements = Object.values(arg.objectValues ?? {}).map((value) =>
            formatGoObjectLiteral(
              value as unknown as Record<string, string>,
              scheme.arrayElementObjectFields
            )
          );
          return `[]map[string]interface{}{${elements.join(", ")}}`;
        }

        const parsedValue = parseJsonIfPossible(arg.value);
        if (Array.isArray(parsedValue)) {
          const goElementType =
            scheme.type === "list" ? "interface{}" : getTypeString(elementType, "golang");
          return `[]${goElementType}{${parsedValue
            .map((item) => formatGoPrimitive(String(item), elementType))
            .join(", ")}}`;
        }

        const goElementType =
          scheme.type === "list" ? "interface{}" : getTypeString(elementType, "golang");
        return `[]${goElementType}{}`;
      }

      return formatGoPrimitive(arg.value, scheme.type);
    })
    .filter(Boolean);

  return args.join(", ");
};

const formatRustFloatLiteral = (value: string, suffix: "f32" | "f64"): string => {
  if (!value) {
    return suffix === "f32" ? "0.0_f32" : "0.0_f64";
  }

  if (/_f32$|_f64$/.test(value)) {
    return value;
  }

  if (!/^[+-]?(?:\d+\.?\d*|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
    return value;
  }

  const normalizedValue = /^[+-]?\d+$/.test(value) ? `${value}.0` : value;
  return `${normalizedValue}_${suffix}`;
};

const formatRustPrimitive = (rawValue: string, type_: ArgumentType): string => {
  const cleanValue = cleanQuotedValue(rawValue);

  switch (type_) {
    case "string":
      return `String::from("${escapeDoubleQuotedString(cleanValue)}")`;
    case "char":
      return `'${escapeSingleQuotedString(cleanValue)}'`;
    case "boolean":
      return cleanValue.toLowerCase() === "true" ? "true" : "false";
    case "number":
    case "double":
      return formatRustFloatLiteral(cleanValue, "f64");
    case "float":
      return formatRustFloatLiteral(cleanValue, "f32");
    default:
      return cleanValue;
  }
};

const formatRustMapLiteral = (values: Record<string, string>) => {
  const entries = Object.entries(values).map(
    ([key, value]) =>
      `("${escapeDoubleQuotedString(key)}".to_string(), "${escapeDoubleQuotedString(
        cleanQuotedValue(value)
      )}".to_string())`
  );

  return `std::collections::HashMap::from([${entries.join(", ")}])`;
};

const splitTopLevel = (value: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const prevChar = value[i - 1];

    if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
      }
      current += char;
      continue;
    }

    if (!inString) {
      if (char === "<") angleDepth++;
      if (char === ">") angleDepth = Math.max(0, angleDepth - 1);
      if (char === "(") parenDepth++;
      if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
      if (char === "[") bracketDepth++;
      if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
      if (char === "{") braceDepth++;
      if (char === "}") braceDepth = Math.max(0, braceDepth - 1);

      if (
        char === "," &&
        angleDepth === 0 &&
        parenDepth === 0 &&
        bracketDepth === 0 &&
        braceDepth === 0
      ) {
        const trimmed = current.trim();
        if (trimmed) {
          parts.push(trimmed);
        }
        current = "";
        continue;
      }
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    parts.push(trimmed);
  }

  return parts;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractRustParameterTypes = (code: string, funcName: string): string[] => {
  const signatureMatch = code.match(
    new RegExp(`fn\\s+${escapeRegex(funcName)}\\s*\\(([^)]*)\\)`, "m")
  );

  if (!signatureMatch?.[1]?.trim()) {
    return [];
  }

  return splitTopLevel(signatureMatch[1])
    .map((param) => param.split(":").slice(1).join(":").trim())
    .filter(Boolean);
};

const formatRustValueBySignature = (value: any, rustType: string): string => {
  const normalizedType = rustType.replace(/\s+/g, "");

  if (normalizedType.startsWith("&str")) {
    return `"${escapeDoubleQuotedString(String(value ?? ""))}"`;
  }

  if (normalizedType.includes("String")) {
    return `String::from("${escapeDoubleQuotedString(String(value ?? ""))}")`;
  }

  if (normalizedType === "bool") {
    return Boolean(value) ? "true" : "false";
  }

  if (normalizedType === "char") {
    return `'${escapeSingleQuotedString(String(value ?? "").charAt(0) || "a")}'`;
  }

  if (normalizedType.includes("f64")) {
    return formatRustFloatLiteral(String(value), "f64");
  }

  if (normalizedType.includes("f32")) {
    return formatRustFloatLiteral(String(value), "f32");
  }

  const vecMatch = normalizedType.match(/^Vec<(.+)>$/);
  if (vecMatch) {
    const elementType = vecMatch[1];
    const arrayValue = Array.isArray(value) ? value : [];
    return `vec![${arrayValue
      .map((item) => formatRustValueBySignature(item, elementType))
      .join(", ")}]`;
  }

  if (
    normalizedType.includes("HashMap") &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return formatRustMapLiteral(
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item)])
      )
    );
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
};

const formatRustArgumentsFromInput = (
  input: string,
  userCode: string,
  funcName: string
): string => {
  const parsedArgs = parseArguments(input);
  const rustTypes = extractRustParameterTypes(userCode, funcName);

  if (!parsedArgs.length || rustTypes.length !== parsedArgs.length) {
    return formatArgumentsForCode(parsedArgs);
  }

  return parsedArgs
    .map((arg, index) => formatRustValueBySignature(arg, rustTypes[index]))
    .join(", ");
};

export const formatArgsForRust = (
  testCaseArgs: TestCaseArgument[] | undefined,
  argumentScheme: ArgumentSchema[]
): string => {
  if (!testCaseArgs || !argumentScheme) return "";

  const args = testCaseArgs
    .map((arg, idx) => {
      const scheme = argumentScheme[idx];
      if (!scheme) return null;

      if (scheme.type === "object" || scheme.type === "map") {
        return formatRustMapLiteral(arg.objectValues ?? {});
      }

      if (scheme.type && scheme.type.startsWith("array_")) {
        const elementType = scheme.type.replace("array_", "") as ArgumentType;
        const parsedValue = parseJsonIfPossible(arg.value);
        if (Array.isArray(parsedValue)) {
          return `vec![${parsedValue
            .map((item) => formatRustPrimitive(String(item), elementType))
            .join(", ")}]`;
        }
        return "vec![]";
      }

      if (scheme.type === "array" || scheme.type === "list") {
        const elementType = scheme.arrayElementType ?? "int";

        if (scheme.arrayElementObjectFields) {
          const elements = Object.values(arg.objectValues ?? {}).map((value) =>
            formatRustMapLiteral(value as unknown as Record<string, string>)
          );
          return `vec![${elements.join(", ")}]`;
        }

        const parsedValue = parseJsonIfPossible(arg.value);
        if (Array.isArray(parsedValue)) {
          return `vec![${parsedValue
            .map((item) => formatRustPrimitive(String(item), elementType))
            .join(", ")}]`;
        }

        return "vec![]";
      }

      return formatRustPrimitive(arg.value, scheme.type);
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
    if (
      language === "javascript" ||
      language === "typescript" ||
      language === "python" ||
      language === "php" ||
      language === "ruby"
    ) {
      return formatArgsForDynamicLang(testCase.args, argumentScheme, language);
    }
    if (language === "rust") {
      return formatArgsForRust(testCase.args, argumentScheme);
    }
    if (language === "golang") {
      return formatArgsForGolang(testCase.args, argumentScheme);
    }
  }

  return testCase.input ?? "";
};

const formatPreviewExampleValue = (type: ArgumentType, value?: string): string => {
  const raw = value?.trim();

  if (raw) {
    if (type === "string" || type === "char") {
      const unquoted = raw.replace(/^["']|["']$/g, "");

      return `"${unquoted}"`;
    }

    if (type === "boolean") {
      return raw.toLowerCase() === "true" ? "true" : "false";
    }

    return raw;
  }

  const sample = getSamplePrimitiveValue(type);

  if (type === "string" || type === "char") {
    return `"${sample}"`;
  }

  return String(sample);
};

const formatObjectFieldsExampleLiteral = (
  fields: ObjectField[],
  language: CodeLanguage,
): string => {
  const lines = fields.map((field) => {
    const example = formatPreviewExampleValue(field.type, field.value);
    const typeLabel = getTypeString(field.type, language) || field.type;

    return `  ${field.name}: ${example},  // ${typeLabel}`;
  });

  return `{\n${lines.join("\n")}\n}`;
};

export const generateObjectClassesForPreview = (
  args: ArgumentSchema[],
  language: CodeLanguage,
  returnSchema?: ReturnSchema
): string => {
  const objectArgs = getGeneratedClassSchemas(args, returnSchema);
  if (objectArgs.length === 0) return "";

  return objectArgs
    .map(({ className, fields: objectFields }) => {
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
          .map((f) => `    public ${getTypeString(f.type, language)} ${f.name};`)
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
          .map((f) => {
            const typeLabel = getTypeString(f.type, language) || f.type;
            const example = formatPreviewExampleValue(f.type, f.value);

            return `this.${f.name} = ${f.name};  // ${typeLabel}, пример: ${example}`;
          })
          .join("\n        ");
        const fieldsLegend = objectFields
          .map((f) => {
            const typeLabel = getTypeString(f.type, language) || f.type;
            const example = formatPreviewExampleValue(f.type, f.value);

            return `//   ${f.name}: ${typeLabel} — пример: ${example}`;
          })
          .join("\n");

        return objectFields.length > 0
          ? `// Класс ${className}
${fieldsLegend}
class ${className} {
    constructor(${constructorParams}) {
        ${constructorBody}
    }
}`
          : `
class ${className} {
}`;
      }
      if (language === "typescript") {
        const constructorParams = objectFields
          .map((f) => `public ${f.name}: ${getTypeString(f.type, language) || "unknown"}`)
          .join(", ");
        return objectFields.length > 0
          ? `
class ${className} {
    constructor(${constructorParams}) {}
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

export const generateObjectSchemaGuideForPreview = (
  args: ArgumentSchema[],
  language: CodeLanguage,
  returnSchema?: ReturnSchema,
): string => {
  const parts: string[] = [];
  const classPreview = generateObjectClassesForPreview(args, language, returnSchema);

  if (classPreview.trim()) {
    parts.push(classPreview.trim());
  }

  if (language !== "javascript" && language !== "typescript") {
    return parts.join("\n\n");
  }

  args.forEach((arg) => {
    if (arg.type === "object" && arg.objectFields?.length) {
      const className = getDefaultClassName(
        arg.className,
        arg.name.charAt(0).toUpperCase() + arg.name.slice(1),
      );

      parts.push(
        `// Пример аргумента ${arg.name} (${className}):\n${formatObjectFieldsExampleLiteral(arg.objectFields, language)}`,
      );
    }

    if (
      (arg.type === "array" || arg.type === "list") &&
      arg.arrayElementType === "object" &&
      arg.arrayElementObjectFields?.length
    ) {
      const elementClassName = getDefaultClassName(
        arg.arrayElementClassName,
        arg.name.charAt(0).toUpperCase() + arg.name.slice(1),
      );
      const elementLiteral = formatObjectFieldsExampleLiteral(
        arg.arrayElementObjectFields,
        language,
      ).replace(/\n/g, "\n  ");

      parts.push(
        `// Пример аргумента ${arg.name} (массив ${elementClassName}):\n[\n  ${elementLiteral.trim()}\n]`,
      );
    }
  });

  if (
    returnSchema?.objectFields?.length &&
    (getEffectiveReturnObjectMode(returnSchema) === "concrete" || returnSchema.className)
  ) {
    const returnClassName = getReturnClassName(returnSchema);

    parts.push(
      `// Пример возвращаемого объекта (${returnClassName}):\n${formatObjectFieldsExampleLiteral(returnSchema.objectFields, language)}`,
    );
  }

  return parts.join("\n\n");
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
      case "typescript": {
        const tsMatch = code.match(
          /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>|let\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>|var\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>/
        );
        return tsMatch ? tsMatch[1] || tsMatch[2] || tsMatch[3] || tsMatch[4] : null;
      }
      case "python": {
        const pyMatch = code.match(/def\s+(\w+)\s*\(/);
        return pyMatch ? pyMatch[1] : null;
      }
      case "php": {
        const phpMatch = code.match(/function\s+(\w+)\s*\(/);
        return phpMatch ? phpMatch[1] : null;
      }
      case "ruby": {
        const rubyTopLevelMatch = code.match(
          /^def\s+(?:self\.)?([A-Za-z_][A-Za-z0-9_]*[!?=]?)\s*(?:\(|$)/m
        );
        if (rubyTopLevelMatch) {
          return rubyTopLevelMatch[1];
        }

        const rubyMatch = code.match(
          /^\s*def\s+(?:self\.)?([A-Za-z_][A-Za-z0-9_]*[!?=]?)\s*(?:\(|$)/m
        );
        return rubyMatch ? rubyMatch[1] : null;
      }
      case "rust": {
        const rustMatches = Array.from(code.matchAll(/fn\s+(\w+)\s*\(/g));
        return rustMatches.find((match) => match[1] !== "main")?.[1] ?? rustMatches[0]?.[1] ?? null;
      }
      case "golang": {
        const goMatches = Array.from(code.matchAll(/func\s+(\w+)\s*\(/g));
        return goMatches.find((match) => match[1] !== "main")?.[1] ?? goMatches[0]?.[1] ?? null;
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

export const resolveTargetFunctionName = (
  explicitFunctionName: string | null | undefined,
  code: string,
  lang: CodeLanguage
): string | null => {
  const normalizedFunctionName = explicitFunctionName?.trim();

  if (normalizedFunctionName) {
    return normalizedFunctionName;
  }

  return extractFunctionName(code, lang);
};

const buildJavaScriptLikeTestCode = (
  userCode: string,
  funcName: string,
  argsStr: string,
  lang: "javascript" | "typescript"
) => `${userCode}

${JS_TYPED_SERIALIZATION_HELPERS}

const __originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

const __logs${lang === "typescript" ? ": string[]" : ""} = [];

console.log = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('' + message);
  __originalConsole.log.apply(console, args);
};

console.error = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('' + message);
  __originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('' + message);
  __originalConsole.warn.apply(console, args);
};

console.info = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  __logs.push('' + message);
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
  console.log(JSON.stringify(__codexSerializeTyped(result)));
  console.log('===RESULT_END===');
  
} catch (error${lang === "typescript" ? ": unknown" : ""}) {
  console.log = __originalConsole.log;
  console.error = __originalConsole.error;
  console.warn = __originalConsole.warn;
  console.info = __originalConsole.info;
  
  console.log('===RESULT_START===');
  console.log(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  console.log('===RESULT_END===');
}`;

const GO_RUNTIME_IMPORTS = ["bytes", "encoding/json", "fmt", "io", "os", "strings"];

const extractGoImports = (code: string): string[] => {
  const imports = new Set<string>();

  const multilineImports = code.match(/import\s+\(([\s\S]*?)\)/m)?.[1];
  if (multilineImports) {
    for (const match of multilineImports.matchAll(/"([^"]+)"/g)) {
      imports.add(match[1]);
    }
  }

  for (const match of code.matchAll(/^\s*import\s+"([^"]+)"\s*$/gm)) {
    imports.add(match[1]);
  }

  return Array.from(imports);
};

const stripGoPackageAndImports = (code: string): string =>
  code
    .replace(/^\s*package\s+\w+\s*/m, "")
    .replace(/^\s*import\s+\(([\s\S]*?)\)\s*/m, "")
    .replace(/^\s*import\s+"[^"]+"\s*$/gm, "")
    .trim();

const buildGoTestCode = (userCode: string, funcName: string, argsStr: string): string => {
  const imports = Array.from(
    new Set([...extractGoImports(userCode), ...GO_RUNTIME_IMPORTS])
  ).sort();
  const codeBody = stripGoPackageAndImports(userCode);

  return `package main

import (
${imports.map((path) => `    "${path}"`).join("\n")}
)

${codeBody}

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
    __codexSerializeTyped(result)
    fmt.Println(__codexSerializeTyped(result))
    fmt.Println("===RESULT_END===")
}`;
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
      if (lang === "rust") {
        return formatRustArgumentsFromInput(input, userCode, funcName);
      }
      const args = parseArguments(input);
      return formatArgumentsForCode(args);
    })();

  switch (lang) {
    case "javascript":
      return buildJavaScriptLikeTestCode(userCode, funcName, argsStr, "javascript");

    case "typescript":
      return buildJavaScriptLikeTestCode(userCode, funcName, argsStr, "typescript");

    case "python":
      return `${userCode}
import json
import sys
from io import StringIO

${PYTHON_TYPED_SERIALIZATION_HELPERS}

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
    print(json.dumps(__codex_serialize_typed(result)))
    print("===RESULT_END===")
    
except Exception as e:
    sys.stdout = __old_stdout
    sys.stderr = __old_stderr
    print("===RESULT_START===")
    print(json.dumps({"error": str(e)}))
    print("===RESULT_END===")`;

    case "php":
      return `${userCode}

ob_start();

try {
    $result = ${funcName}(${argsStr});
    $logs = ob_get_clean();

    if (!empty($logs)) {
        echo "===LOGS_START===\\n";
        echo $logs;
        if (!str_ends_with($logs, PHP_EOL)) {
            echo PHP_EOL;
        }
        echo "===LOGS_END===\\n";
    }

    echo "===RESULT_START===\\n";
    echo json_encode(__codex_serialize_typed($result));
    echo "\\n===RESULT_END===\\n";
} catch (Throwable $error) {
    if (ob_get_level() > 0) {
        ob_end_clean();
    }

    echo "===RESULT_START===\\n";
    echo json_encode(["error" => $error->getMessage()]);
    echo "\\n===RESULT_END===\\n";
}`;

    case "ruby":
      return `${userCode}
require "json"
require "stringio"

__original_stdout = $stdout
__stdout_buffer = StringIO.new
$stdout = __stdout_buffer

begin
  result = ${funcName}(${argsStr})
  $stdout = __original_stdout
  logs = __stdout_buffer.string

  unless logs.empty?
    puts "===LOGS_START==="
    print logs
    puts unless logs.end_with?("\\n")
    puts "===LOGS_END==="
  end

  puts "===RESULT_START==="
  puts JSON.generate(__codex_serialize_typed(result))
  puts "===RESULT_END==="
rescue => error
  $stdout = __original_stdout
  puts "===RESULT_START==="
  puts JSON.generate({ error: error.message })
  puts "===RESULT_END==="
end`;

    case "rust":
      return `${userCode}

fn __codex_serialize<T: std::fmt::Debug>(value: &T) -> String {
    format!("{:?}", value)
}

fn main() {
    let result = ${funcName}(${argsStr});
    println!("===RESULT_START===");
    println!("{}", __codex_serialize(&result));
    println!("===RESULT_END===");
}`;

    case "java":
      return buildJavaTestSuiteWithLogs(userCode, [{ input, expectedOutput: "" }], funcName);

    case "csharp":
      return buildCSharpTestSuite(userCode, [{ input, expectedOutput: "" }], funcName);

    case "golang":
      return buildGoTestCode(userCode, funcName, argsStr);

    default:
      return userCode;
  }
};

const normalizeComparableValue = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

export const compareOutputs = (
  actual: unknown,
  expected: unknown,
  options?: CompareOutputsOptions,
): boolean => {
  const normalizedActual = normalizeComparableValue(actual);
  const normalizedExpected = normalizeComparableValue(expected);

  if (options?.returnType) {
    return compareOutputsWithType(
      normalizedActual,
      normalizedExpected,
      options.returnType,
      options.returnSchema,
    );
  }

  return compareOutputsWithType(normalizedActual, normalizedExpected);
};

export interface ConstraintResult {
  type: CodeConstraintType;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  value?: number | string[] | boolean;
}
