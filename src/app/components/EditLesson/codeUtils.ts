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
            System.out.print(__serializeJson(result));
            System.out.println("===RESULT_END===");
            
        } catch (Exception e) {
            System.setOut(originalOut);
            System.out.println("===RESULT_START===");
            System.out.print("{\\"error\\":" + __serializeJson(e.getMessage()) + "}");
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

export const parseValue = (value: string): any => {
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

  if (type_ === "object" && objectClassName) {
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
    return language === "java" || language === "csharp" || language === "cpp" ? "void" : "";
  }
  if (type_ === "object") {
    const objectReturnMode = getEffectiveReturnObjectMode(returnSchema);
    if (
      preferSchemaClassName &&
      objectReturnMode === "concrete" &&
      (language === "java" || language === "csharp") &&
      (returnSchema?.className || returnSchema?.objectFields)
    ) {
      return getReturnClassName(returnSchema);
    }
    return language === "java" ? "Object" : language === "golang" ? "interface{}" : "object";
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
              : "object";
      }
      return language === "csharp"
        ? "System.Collections.IEnumerable"
        : language === "java"
          ? "List<?>"
          : language === "golang"
            ? "[]interface{}"
            : "object";
    }

    return language === "csharp"
      ? `List<${getCollectionElementTypeString(elementType, "csharp", objectClassName)}>`
      : language === "java"
        ? `List<${getCollectionElementTypeString(elementType, "java", objectClassName)}>`
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
  return "List";
};

export const getDefaultStarterCode = (
  language: CodeLanguage,
  args: ArgumentSchema[] = [],
  returnType: ArgumentType = "int",
  returnSchema?: ReturnSchema
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

  const retTypeStr = getReturnTypeString(returnType, language, returnSchema, true);
  const returnValue = getDefaultReturnValue(returnType, language);
  const hasListTypes = args.some((arg) => arg.type === "list") || returnType === "list";

  switch (language) {
    case "csharp":
      return `${hasListTypes ? "using System.Collections.Generic;\n" : ""}using System;

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
      return `${hasListTypes ? "import java.util.List;\n\n" : ""}public class Main {
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
      const goRetStr = getReturnTypeString(returnType, "golang", returnSchema, true);

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
  return `
    private static String __escapeJson(String value) {
        if (value == null) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            switch (ch) {
                case '\\\\':
                    sb.append("\\\\\\\\");
                    break;
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\n':
                    sb.append("\\\\n");
                    break;
                case '\\r':
                    sb.append("\\\\r");
                    break;
                case '\\t':
                    sb.append("\\\\t");
                    break;
                case '\\b':
                    sb.append("\\\\b");
                    break;
                case '\\f':
                    sb.append("\\\\f");
                    break;
                default:
                    sb.append(ch);
            }
        }
        return sb.toString();
    }

    private static String __serializeJson(Object value) {
        return __serializeJson(value, new java.util.IdentityHashMap<>());
    }

    private static String __serializeJson(Object value, java.util.IdentityHashMap<Object, Boolean> visited) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String || value instanceof Character) {
            return '"' + __escapeJson(String.valueOf(value)) + '"';
        }
        if (value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }

        Class<?> clazz = value.getClass();

        if (clazz.isArray()) {
            int length = java.lang.reflect.Array.getLength(value);
            java.util.List<String> items = new java.util.ArrayList<>();
            for (int i = 0; i < length; i++) {
                items.add(__serializeJson(java.lang.reflect.Array.get(value, i), visited));
            }
            return "[" + String.join(", ", items) + "]";
        }

        if (value instanceof java.util.Collection<?>) {
            java.util.List<String> items = new java.util.ArrayList<>();
            for (Object item : (java.util.Collection<?>) value) {
                items.add(__serializeJson(item, visited));
            }
            return "[" + String.join(", ", items) + "]";
        }

        if (value instanceof java.util.Map<?, ?>) {
            java.util.Map<String, String> entries = new java.util.TreeMap<>();
            for (java.util.Map.Entry<?, ?> entry : ((java.util.Map<?, ?>) value).entrySet()) {
                String key = String.valueOf(entry.getKey());
                entries.put(key, '"' + __escapeJson(key) + "\\":" + __serializeJson(entry.getValue(), visited));
            }
            return "{" + String.join(", ", entries.values()) + "}";
        }

        if (visited.containsKey(value)) {
            return '"' + "<circular>" + '"';
        }

        visited.put(value, Boolean.TRUE);

        java.util.List<java.lang.reflect.Field> fields = new java.util.ArrayList<>();
        Class<?> current = clazz;
        while (current != null && current != Object.class) {
            for (java.lang.reflect.Field field : current.getDeclaredFields()) {
                int modifiers = field.getModifiers();
                if (java.lang.reflect.Modifier.isStatic(modifiers) || field.isSynthetic()) {
                    continue;
                }
                fields.add(field);
            }
            current = current.getSuperclass();
        }

        fields.sort(java.util.Comparator.comparing(java.lang.reflect.Field::getName));

        java.util.List<String> serializedFields = new java.util.ArrayList<>();
        for (java.lang.reflect.Field field : fields) {
            try {
                field.setAccessible(true);
                serializedFields.add(
                    '"' +
                    __escapeJson(field.getName()) +
                    "\\":" +
                    __serializeJson(field.get(value), visited)
                );
            } catch (IllegalAccessException e) {
                serializedFields.add(
                    '"' +
                    __escapeJson(field.getName()) +
                    "\\":" +
                    __serializeJson("<inaccessible>", visited)
                );
            }
        }

        visited.remove(value);
        return "{" + String.join(", ", serializedFields) + "}";
    }

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
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result, jsonOptions));
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
                System.out.print(__serializeJson(result));
                System.out.println("===RESULT_END_" + ${index + 1} + "===");
                
            } catch (Exception e) {
                System.setOut(originalOut);
                System.out.println("===RESULT_START_" + ${index + 1} + "===");
                System.out.print("{\\"error\\":" + __serializeJson(e.getMessage()) + "}");
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
                System.out.print(__serializeJson(result));
                System.out.println();
                System.out.println("===RESULT_END_" + ${testNum} + "===");
                
            } catch (Exception e) {
                System.setOut(originalOut);
                System.out.println("===RESULT_START_" + ${testNum} + "===");
                System.out.print("{\\"error\\":" + __serializeJson(e.getMessage()) + "}");
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
          } catch {
          
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
  __logs.push('ℹ' + message);
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
    return actual.every((item, index) => compareOutputs(item, expected[index]));
  }

  if (typeof actual === "object" && typeof expected === "object") {
    return Object.entries(expected).every(([key, value]) => compareOutputs(actual[key], value));
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
