"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./page.module.scss";

import Button from "@/app/components/Button";
import CodeEditor from "@/app/components/CodeEditor";
import {
  buildCSharpTestSuite as buildSharedCSharpTestSuite,
  buildExpectedObjectOutput as buildSharedExpectedObjectOutput,
  buildJavaTestSuite as buildSharedJavaTestSuite,
  buildTestCode as buildSharedTestCode,
  compareOutputs as compareSharedOutputs,
  formatArgsForDynamicLang as formatSharedDynamicArgs,
  formatArgsForGolang as formatSharedGolangArgs,
  formatArgsForJavaOrCSharp as formatSharedJavaOrCSharpArgs,
  formatArgsForRust as formatSharedRustArgs,
  generateObjectClasses as generateSharedObjectClasses,
  getDefaultStarterCode as getSharedDefaultStarterCode,
  getEffectiveReturnObjectMode as getSharedReturnObjectMode,
  getExpectedOutputFromTestCase as getSharedExpectedOutputFromTestCase,
  getStarterFunctionName as getSharedStarterFunctionName,
  getTypeString as getSharedTypeString,
  resolveTargetFunctionName as resolveSharedTargetFunctionName,
} from "@/app/components/EditLesson/codeUtils";
import {
  getDefaultArgumentTypeForLanguage,
  getDefaultReturnTypeForLanguage,
  getLanguageSchemaConfig,
  normalizeArgumentSchemeForLanguage,
  normalizeReturnSchemaForLanguage,
} from "@/app/components/EditLesson/schemaBuilderConfig";
import type {
  ArgumentSchema,
  ArgumentType,
  CodeTaskTestCase,
  ReturnObjectMode,
  ReturnSchema,
} from "@/app/components/EditLesson/types";
import type { CodeLanguage } from "@/app/http/codeService";
import { CodeService } from "@/app/http/codeService";
import {
  type CodeConstraint,
  type CodeTask,
  CodingTasksService,
  type TestCase,
} from "@/app/http/codingTasksService";

type CodeConstraintType =
  | "maxTimeMs"
  | "maxLines"
  | "forbiddenTokens"
  | "noComments"
  | "noConsoleLog"
  | "maxComplexity"
  | "memoryLimit"
  | "requiredKeywords";

interface ConstraintCheckResult {
  passed: boolean;
  errors: string[];
}

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

const hasComments = (code: string, language: CodeLanguage): boolean => {
  if (language === "python" || language === "ruby") {
    return /#.*/.test(code);
  }

  if (language === "php") {
    return /#.*/.test(code) || /\/\/.*|\/\*[\s\S]*?\*\//.test(code);
  }

  return /\/\/.*|\/\*[\s\S]*?\*\//.test(code);
};

const hasConsoleLog = (code: string, language: CodeLanguage): boolean => {
  if (language === "javascript" || language === "typescript") {
    return /\bconsole\.(log|error|warn|info)\s*\(/.test(code);
  }

  if (language === "python") {
    return /\bprint\s*\(/.test(code);
  }

  if (language === "php") {
    return /\b(?:echo|print|print_r|var_dump)\b/.test(code);
  }

  if (language === "ruby") {
    return /\b(?:puts|print|p)\b/.test(code);
  }

  if (language === "rust") {
    return /\b(?:println!|print!|eprintln!|eprint!)\s*\(/.test(code);
  }

  if (language === "golang") {
    return /\bfmt\.Print(?:ln|f)?\s*\(/.test(code);
  }

  if (language === "cpp") {
    return /\bcout\s*<</.test(code);
  }

  if (language === "java") {
    return /\bSystem\.out\.(print|println)\s*\(/.test(code);
  }

  if (language === "csharp") {
    return /\bConsole\.(WriteLine|Write)\s*\(/.test(code);
  }

  return false;
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

const checkConstraints = (
  code: string,
  language: CodeLanguage,
  constraints: CodeConstraint[]
): ConstraintCheckResult => {
  const errors: string[] = [];

  for (const constraint of constraints) {
    const type = constraint.type as CodeConstraintType;

    switch (type) {
      case "maxLines": {
        const maxLines = constraint.value as number;
        const actualLines = countCodeLines(code);

        if (actualLines > maxLines) {
          errors.push(`Превышено максимальное количество строк: ${actualLines} > ${maxLines}`);
        }

        break;
      }

      case "forbiddenTokens": {
        const forbiddenTokens = constraint.value as string[];

        for (const token of forbiddenTokens) {
          const tokenRegex = new RegExp(`\\b${token}\\b`, "g");

          if (tokenRegex.test(code)) {
            errors.push(`Использование запрещенного токена: "${token}"`);
          }
        }

        break;
      }

      case "noComments": {
        if (constraint.value === true && hasComments(code, language)) {
          errors.push("Использование комментариев запрещено");
        }

        break;
      }

      case "noConsoleLog": {
        if (constraint.value === true && hasConsoleLog(code, language)) {
          if (language === "javascript" || language === "typescript") {
            errors.push("Использование console.log запрещено");
          } else if (language === "python") {
            errors.push("Использование print запрещено");
          } else {
            errors.push("Использование вывода в консоль запрещено");
          }
        }

        break;
      }

      case "maxComplexity": {
        const maxComplexity = constraint.value as number;
        const actualComplexity = calculateComplexity(code);

        if (actualComplexity > maxComplexity) {
          errors.push(
            `Превышена максимальная сложность кода: ${actualComplexity} > ${maxComplexity}`
          );
        }

        break;
      }

      case "requiredKeywords": {
        const requiredKeywords = constraint.value as string[];

        if (!hasRequiredKeywords(code, requiredKeywords)) {
          errors.push(`Отсутствуют обязательные ключевые слова: ${requiredKeywords.join(", ")}`);
        }

        break;
      }

      case "maxTimeMs": {
        break;
      }

      case "memoryLimit": {
        break;
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
};

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "golang", label: "Go" },
  { value: "cpp", label: "C++" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Легкий", color: "#4caf50" },
  { value: "medium", label: "Средний", color: "#ff9800" },
  { value: "hard", label: "Сложный", color: "#f44336" },
];

const TAG_OPTIONS = [
  "JS",
  "Python",
  "Golang",
  "C#",
  "Java",
  "Rust",
  "TypeScript",
  "PHP",
  "Ruby",
  "Строки",
  "Сортировки",
  "Массивы",
  "Математика",
  "Матрицы",
  "Стек",
  "Очередь",
  "Связный список",
  "Динамическое программирование",
  "Теория игр",
  "Жадные алгоритмы",
  "Хеш-таблица",
  "Деревья",
  "Бинарное дерево",
];

const getDefaultStarterCode = (lang: CodeLanguage, functionName?: string): string => {
  return getSharedDefaultStarterCode(
    lang,
    [],
    getDefaultReturnTypeForLanguage(lang),
    undefined,
    functionName
  );
};

const getTypeString = (type_: ArgumentType, language: CodeLanguage): string => {
  return getSharedTypeString(type_, language);
};

const getDefaultStarterCodeWithSchema = (
  language: CodeLanguage,
  args: ArgumentSchema[] = [],
  returnType: ArgumentType = getDefaultReturnTypeForLanguage(language),
  returnSchema?: ReturnSchema,
  functionName?: string
): string => {
  return getSharedDefaultStarterCode(language, args, returnType, returnSchema, functionName);
};

const getReturnObjectMode = (returnSchema?: ReturnSchema): ReturnObjectMode =>
  getSharedReturnObjectMode(returnSchema);

const getExpectedOutputValue = (
  testCase: TestCase,
  returnType: ArgumentType,
  returnSchema?: ReturnSchema
): string =>
  getSharedExpectedOutputFromTestCase(
    testCase as unknown as CodeTaskTestCase,
    returnType,
    returnSchema
  );

const getFormattedTestInput = (
  language: CodeLanguage,
  testCase: TestCase,
  scheme: ArgumentSchema[],
  userCode: string
): string => {
  if (testCase.args && scheme.length > 0) {
    if (language === "java" || language === "csharp") {
      return formatSharedJavaOrCSharpArgs(testCase.args, scheme, language);
    }

    if (language === "golang") {
      return formatSharedGolangArgs(testCase.args, scheme);
    }

    if (language === "rust") {
      return formatSharedRustArgs(testCase.args, scheme);
    }

    if (
      language === "javascript" ||
      language === "typescript" ||
      language === "python" ||
      language === "php" ||
      language === "ruby"
    ) {
      return formatSharedDynamicArgs(testCase.args, scheme, language);
    }
  }

  void userCode;

  return testCase.input || "";
};

const extractExecutionResult = (output: string, testNum?: number): string => {
  if (!output.trim()) {
    return "";
  }

  const lines = output.split(/\r?\n/);
  const resultLines: string[] = [];
  let inResult = false;

  const startMarkers = testNum
    ? [`===RESULT_START_${testNum}===`, "===RESULT_START==="]
    : ["===RESULT_START==="];
  const endMarkers = testNum
    ? [`===RESULT_END_${testNum}===`, "===RESULT_END==="]
    : ["===RESULT_END==="];

  for (const line of lines) {
    if (startMarkers.some((marker) => line.includes(marker))) {
      inResult = true;
      continue;
    }

    if (endMarkers.some((marker) => line.includes(marker))) {
      break;
    }

    if (inResult) {
      resultLines.push(line);
    }
  }

  return resultLines.length > 0 ? resultLines.join("\n").trim() : output.trim();
};

const normalizeComparableOutput = (value: string): unknown => {
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

/* eslint-disable @typescript-eslint/no-unused-vars */
const generateObjectClasses = (args: ArgumentSchema[], language: CodeLanguage): string => {
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
${fields.replace(/ {8}/g, "    ")}
${constructor.replace(/ {8}/g, "    ")}
${gettersSetters}
}`;
      }

      if (language === "javascript") {
        const constructorParams = objectFields.map((f) => f.name).join(", ");
        const constructorBody = objectFields
          .map((f) => `this.${f.name} = ${f.name};`)
          .join("\n    ");
        const constructor =
          objectFields.length > 0
            ? `
class ${className} {
    constructor(${constructorParams}) {
        ${constructorBody}
    }
}`
            : `
class ${className} {
}`;

        return constructor;
      }

      if (language === "python") {
        const constructorParams = objectFields.map((f) => f.name).join(", ");
        const constructorBody = objectFields
          .map((f) => `self.${f.name} = ${f.name}`)
          .join("\n        ");
        const constructor =
          objectFields.length > 0
            ? `
class ${className}:
    def __init__(self, ${constructorParams}):
        ${constructorBody}`
            : `
class ${className}:
    pass`;

        return constructor;
      }

      return "";
    })
    .join("\n\n");
};

type View = "list" | "create" | "edit";

export default function CodingPage() {
  const [view, setView] = useState<View>("list");
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<CodeLanguage[]>(["javascript"]);
  const [startCodes, setStartCodes] = useState<Record<string, string>>({
    javascript: getDefaultStarterCode("javascript"),
  });
  const [activeEditorLang, setActiveEditorLang] = useState<CodeLanguage>("javascript");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testCasesByLanguage, setTestCasesByLanguage] = useState<Record<string, TestCase[]>>({});
  const [activeTestLang, setActiveTestLang] = useState<string>("");
  const [constraints, setConstraints] = useState<CodeConstraint[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [experienceReward, setExperienceReward] = useState(10);
  const [argumentScheme, setArgumentScheme] = useState<ArgumentSchema[]>([]);
  const [returnType, setReturnType] = useState<ArgumentType>(
    getDefaultReturnTypeForLanguage("javascript")
  );
  const [returnSchema, setReturnSchema] = useState<ReturnSchema | undefined>(undefined);

  const [codeOutput, setCodeOutput] = useState("");
  const [runLoading, setRunLoading] = useState(false);
  const [constraintErrors, setConstraintErrors] = useState<string[]>([]);
  const [constraintsPassed, setConstraintsPassed] = useState<boolean | null>(null);
  const [testResults, setTestResults] = useState<
    { input: string; expected: string; actual: string; passed: boolean }[] | null
  >(null);
  const activeSchemaConfig = getLanguageSchemaConfig(activeEditorLang);
  const supportsConcreteObjectClasses = activeSchemaConfig.supportsConcreteObjectClasses;
  const normalizedArgumentScheme = normalizeArgumentSchemeForLanguage(argumentScheme, activeEditorLang);
  const normalizedReturnState = normalizeReturnSchemaForLanguage(
    returnType,
    returnSchema,
    activeEditorLang
  );
  const normalizedReturnType = normalizedReturnState.returnType;
  const normalizedReturnSchema = normalizedReturnState.returnSchema;

  const createDefaultObjectField = (
    index: number,
    targetLanguage: CodeLanguage = activeEditorLang
  ) => ({
    name: `field${index + 1}`,
    type: getLanguageSchemaConfig(targetLanguage).objectFieldTypes[0]?.value ?? ("string" as ArgumentType),
    value: "",
  });

  const buildStarterCodeForLanguage = (
    lang: CodeLanguage,
    args: ArgumentSchema[] = argumentScheme,
    nextReturnType: ArgumentType = returnType,
    nextReturnSchema: ReturnSchema | undefined = returnSchema,
    nextFunctionName?: string
  ) => {
    const normalizedArgs = normalizeArgumentSchemeForLanguage(args, lang);
    const normalizedReturn = normalizeReturnSchemaForLanguage(
      nextReturnType,
      nextReturnSchema,
      lang
    );

    return getDefaultStarterCodeWithSchema(
      lang,
      normalizedArgs,
      normalizedReturn.returnType,
      normalizedReturn.returnSchema,
      nextFunctionName
    );
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CodingTasksService.getAllTasks();

      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setDescription("");
    setFunctionName("");
    setTags([]);
    setSelectedLanguages(["javascript"]);
    setStartCodes({ javascript: getDefaultStarterCode("javascript") });
    setActiveEditorLang("javascript");
    setTestCases([]);
    setTestCasesByLanguage({});
    setActiveTestLang("");
    setConstraints([]);
    setDifficulty("easy");
    setExperienceReward(10);
    setCodeOutput("");
    setConstraintErrors([]);
    setConstraintsPassed(null);
    setTestResults(null);
    setArgumentScheme([]);
    setReturnType(getDefaultReturnTypeForLanguage("javascript"));
    setReturnSchema(undefined);
  };

  const handleCreate = () => {
    resetForm();
    setView("create");
  };

  const handleEdit = (task: CodeTask) => {
    setEditId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setFunctionName(task.functionName || "");
    setTags(task.tags || []);
    setSelectedLanguages((task.languages || []) as CodeLanguage[]);
    setStartCodes(task.startCodes || {});
    setActiveEditorLang((task.languages?.[0] || "javascript") as CodeLanguage);
    setTestCases(task.testCases || []);
    setTestCasesByLanguage(task.testCasesByLanguage || {});
    setActiveTestLang(task.languages?.[0] || "javascript");
    setConstraints(task.constraints || []);
    setDifficulty(task.difficulty as "easy" | "medium" | "hard");
    setExperienceReward(task.experienceReward);
    const taskLanguage = ((task.languages?.[0] || "javascript") as CodeLanguage) ?? "javascript";
    const normalizedScheme = normalizeArgumentSchemeForLanguage(
      (task.argumentScheme || []) as ArgumentSchema[],
      taskLanguage
    );
    const normalizedReturn = normalizeReturnSchemaForLanguage(
      (task.returnType || getDefaultReturnTypeForLanguage(taskLanguage)) as ArgumentType,
      task.returnSchema as ReturnSchema | undefined,
      taskLanguage
    );

    setArgumentScheme(normalizedScheme);
    setReturnType(normalizedReturn.returnType);
    setReturnSchema(normalizedReturn.returnSchema);
    setView("edit");
  };

  const handleDelete = async (id: string) => {
 
    try {
      await CodingTasksService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const convertArgsToInput = (
    testCases: TestCase[],
    scheme: ArgumentSchema[],
    language: string
  ): TestCase[] => {
    return testCases.map((tc) => {
      if (tc.args && tc.args.length > 0 && scheme && scheme.length > 0) {
        const argValues = tc.args.map((arg, idx) => {
          const argScheme = scheme[idx];

          if (!argScheme) return arg.value;

          if (
            argScheme.type === "object" &&
            arg.objectValues &&
            Object.keys(arg.objectValues).length > 0
          ) {
            if (language === "javascript" || language === "python") {
              return JSON.stringify(arg.objectValues);
            }
          }

          return arg.value;
        });

        return { ...tc, input: argValues.join(", ") };
      }

      return tc;
    });
  };

  const updateConfiguredFunctionName = (value: string) => {
    setFunctionName(value);
    setStartCodes((prev) => {
      const nextCodes = { ...prev };

      selectedLanguages.forEach((lang) => {
        const currentCode = prev[lang] ?? "";
        const currentGeneratedCode = buildStarterCodeForLanguage(
          lang,
          argumentScheme,
          returnType,
          returnSchema,
          functionName
        );
        const nextGeneratedCode = buildStarterCodeForLanguage(
          lang,
          argumentScheme,
          returnType,
          returnSchema,
          value
        );

        if (!currentCode.trim() || currentCode === currentGeneratedCode) {
          nextCodes[lang] = nextGeneratedCode;
        }
      });

      return nextCodes;
    });
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
     

      return;
    }

    if (selectedLanguages.length === 0) {
     
      return;
    }

    const hasTestsInAnyLang = Object.values(testCasesByLanguage).some((tcs) => tcs.length > 0);

    if (!hasTestsInAnyLang) {
 
      return;
    }

    const missingCode = selectedLanguages.filter((l) => !startCodes[l]?.trim());

    if (missingCode.length > 0) {
      const labels = missingCode.map((l) => LANGUAGES.find((ll) => ll.value === l)?.label || l);
 
      return;
    }

    setSaving(true);
    try {
      const firstLangTestCases = testCasesByLanguage[selectedLanguages[0]] || [];
      const processedTestCases = convertArgsToInput(
        firstLangTestCases,
        argumentScheme,
        selectedLanguages[0]
      );

      const processedTestCasesByLanguage: Record<string, TestCase[]> = {};

      for (const lang of selectedLanguages) {
        const langTestCases = testCasesByLanguage[lang] || [];

        processedTestCasesByLanguage[lang] = convertArgsToInput(
          langTestCases,
          argumentScheme,
          lang
        );
      }

      const payload = {
        title,
        description,
        functionName: functionName.trim() || undefined,
        tags,
        languages: selectedLanguages,
        startCodes,
        testCases: processedTestCases,
        testCasesByLanguage: processedTestCasesByLanguage,
        constraints,
        difficulty,
        experienceReward,
        argumentScheme,
        returnType,
        returnSchema,
      };

      if (editId) {
        const updated = await CodingTasksService.updateTask(editId, payload);

        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await CodingTasksService.createTask(payload);

        setTasks((prev) => [created, ...prev]);
      }

      setView("list");
      resetForm();
    } catch (e) {
      console.error("Save failed:", e);
 
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: CodeLanguage) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev;

        const next = prev.filter((l) => l !== lang);

        if (activeEditorLang === lang) setActiveEditorLang(next[0]);

        setStartCodes((codes) => {
          const copy = { ...codes };

          delete copy[lang];

          return copy;
        });

        return next;
      }

        setStartCodes((codes) => ({
          ...codes,
          [lang]: codes[lang] || buildStarterCodeForLanguage(lang, [], getDefaultReturnTypeForLanguage(lang), undefined, functionName),
        }));

      return [...prev, lang];
    });
  };

  const updateStartCode = (lang: string, code: string) => {
    setStartCodes((prev) => ({ ...prev, [lang]: code }));
  };

  const addTestCase = () => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (!newTestCases[lang]) {
      newTestCases[lang] = [];
    }

    newTestCases[lang] = [...newTestCases[lang], { input: "", expectedOutput: "", args: [] }];
    setTestCasesByLanguage(newTestCases);
  };

  const updateTestCaseInput = (testCaseIndex: number, value: string) => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (newTestCases[lang] && newTestCases[lang][testCaseIndex]) {
      newTestCases[lang] = [...newTestCases[lang]];
      newTestCases[lang][testCaseIndex] = { ...newTestCases[lang][testCaseIndex], input: value };
      setTestCasesByLanguage(newTestCases);
    }
  };

  const updateTestCaseExpected = (testCaseIndex: number, value: string) => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (newTestCases[lang] && newTestCases[lang][testCaseIndex]) {
      newTestCases[lang] = [...newTestCases[lang]];
      newTestCases[lang][testCaseIndex] = {
        ...newTestCases[lang][testCaseIndex],
        expectedOutput: value,
      };
      setTestCasesByLanguage(newTestCases);
    }
  };

  const updateTestCaseExpectedObjectValue = (
    testCaseIndex: number,
    fieldName: string,
    value: string
  ) => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (!newTestCases[lang] || !newTestCases[lang][testCaseIndex]) {
      return;
    }

    newTestCases[lang] = [...newTestCases[lang]];
    const testCase = { ...newTestCases[lang][testCaseIndex] };
    const expectedObjectValues = {
      ...(testCase.expectedObjectValues ?? {}),
      [fieldName]: value,
    };

    testCase.expectedObjectValues = expectedObjectValues;
    testCase.expectedOutput = buildSharedExpectedObjectOutput(expectedObjectValues, normalizedReturnSchema);
    newTestCases[lang][testCaseIndex] = testCase;
    setTestCasesByLanguage(newTestCases);
  };

  const syncTestCasesWithReturnSchema = (
    casesByLanguage: Record<string, TestCase[]>,
    nextReturnType: ArgumentType,
    nextReturnSchema: ReturnSchema | undefined
  ) =>
    Object.fromEntries(
      Object.entries(casesByLanguage).map(([lang, cases]) => [
        lang,
        (cases ?? []).map((testCase) =>
          nextReturnType === "object"
            ? {
                ...testCase,
                expectedOutput: getExpectedOutputValue(testCase, nextReturnType, nextReturnSchema),
              }
            : testCase
        ),
      ])
    );

  const updateReturnSchemaState = (
    nextReturnSchema: ReturnSchema,
    nextReturnType: ArgumentType = returnType
  ) => {
    const normalizedNextReturn = normalizeReturnSchemaForLanguage(
      nextReturnType,
      nextReturnSchema,
      activeEditorLang
    );

    setReturnType(normalizedNextReturn.returnType);
    setReturnSchema(normalizedNextReturn.returnSchema);
    setTestCasesByLanguage((prev) =>
      syncTestCasesWithReturnSchema(
        prev,
        normalizedNextReturn.returnType,
        normalizedNextReturn.returnSchema
      )
    );
    setStartCodes((prev) => {
      const nextCodes = { ...prev };

      selectedLanguages.forEach((lang) => {
        nextCodes[lang] = buildStarterCodeForLanguage(
          lang,
          argumentScheme,
          normalizedNextReturn.returnType,
          normalizedNextReturn.returnSchema,
          functionName
        );
      });

      return nextCodes;
    });
  };

  const updateTestCaseArgValue = (testCaseIndex: number, argIndex: number, value: string) => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (!newTestCases[lang]) return;

    newTestCases[lang] = [...newTestCases[lang]];
    const tc = { ...newTestCases[lang][testCaseIndex] };
    const args = tc.args ? [...tc.args] : [];

    if (!args[argIndex]) {
      args[argIndex] = { index: argIndex, value: "", objectValues: {} };
    }

    args[argIndex] = { ...args[argIndex], value };

    tc.args = args;
    newTestCases[lang][testCaseIndex] = tc;
    setTestCasesByLanguage(newTestCases);
  };

  const updateTestCaseArgObjectValue = (
    testCaseIndex: number,
    argIndex: number,
    fieldName: string,
    value: string
  ) => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (!newTestCases[lang]) return;

    newTestCases[lang] = [...newTestCases[lang]];
    const tc = { ...newTestCases[lang][testCaseIndex] };
    const args = tc.args ? [...tc.args] : [];

    if (!args[argIndex]) {
      args[argIndex] = { index: argIndex, value: "", objectValues: {} };
    }

    const objectValues = args[argIndex].objectValues ? { ...args[argIndex].objectValues } : {};

    objectValues[fieldName] = value;
    args[argIndex] = { ...args[argIndex], objectValues };

    tc.args = args;
    newTestCases[lang][testCaseIndex] = tc;
    setTestCasesByLanguage(newTestCases);
  };

  const deleteTestCase = (testCaseIndex: number) => {
    const lang = activeTestLang || selectedLanguages[0];
    const newTestCases = { ...testCasesByLanguage };

    if (newTestCases[lang]) {
      newTestCases[lang] = newTestCases[lang].filter((_, idx) => idx !== testCaseIndex);
      setTestCasesByLanguage(newTestCases);
    }
  };

  const addConstraint = () =>
    setConstraints((prev) => [...prev, { type: "maxTimeMs", value: 1000 }]);
  const updateConstraint = (i: number, type: string, value: number | string[] | boolean) =>
    setConstraints((prev) => prev.map((c, idx) => (idx === i ? { type, value } : c)));
  const deleteConstraint = (i: number) =>
    setConstraints((prev) => prev.filter((_, idx) => idx !== i));

  const handleRunCode = async () => {
    setRunLoading(true);
    setCodeOutput("");
    setConstraintErrors([]);
    setConstraintsPassed(null);
    setTestResults(null);
    try {
      const res = await CodeService.executeCode({
        language: activeEditorLang,
        code: startCodes[activeEditorLang] || "",
      });

      setCodeOutput(res.error || res.output || "Нет вывода");
    } catch {
      setCodeOutput("Ошибка выполнения");
    } finally {
      setRunLoading(false);
    }
  };

  const handleTestCode = async () => {
    const code = startCodes[activeEditorLang] || "";
    const lang = activeTestLang || activeEditorLang;
    const currentTestCases = testCasesByLanguage[lang] || [];

    setRunLoading(true);
    setCodeOutput("");
    setTestResults(null);

    try {
      const constraintResult = checkConstraints(code, activeEditorLang, constraints);

      setConstraintErrors(constraintResult.errors);
      setConstraintsPassed(constraintResult.passed);

      if (!constraintResult.passed) {
        setCodeOutput(" Ограничения не пройдены:\n" + constraintResult.errors.join("\n"));
        setRunLoading(false);

        return;
      }

      if (currentTestCases.length === 0) {
        setCodeOutput(
          " Ограничения пройдены. Добавьте тест-кейсы для языка " +
            (LANGUAGES.find((l) => l.value === lang)?.label || lang)
        );
        setRunLoading(false);

        return;
      }

      const results: { input: string; expected: string; actual: string; passed: boolean }[] = [];
      const funcName = resolveSharedTargetFunctionName(
        functionName,
        code,
        activeEditorLang
      );
      const objectClasses =
        normalizedArgumentScheme.length > 0
          ? generateSharedObjectClasses(
              normalizedArgumentScheme,
              activeEditorLang,
              normalizedReturnSchema
            )
          : "";

      for (let i = 0; i < currentTestCases.length; i++) {
        const tc = currentTestCases[i];
        const inputToUse = getFormattedTestInput(
          activeEditorLang,
          tc,
          normalizedArgumentScheme,
          code
        );
        const expectedOutput = getExpectedOutputValue(
          tc,
          normalizedReturnType,
          normalizedReturnSchema
        );

        let testCode = code;
        let expectedTestNum: number | undefined;

        if (activeEditorLang === "java" && funcName) {
          testCode = buildSharedJavaTestSuite(
            code,
            [{ input: inputToUse, expectedOutput }],
            funcName
          );
          expectedTestNum = 1;

          if (objectClasses) {
            testCode = `${testCode}\n\n${objectClasses}`;
          }
        } else if (activeEditorLang === "csharp" && funcName) {
          testCode = buildSharedCSharpTestSuite(
            code,
            [{ input: inputToUse, expectedOutput }],
            funcName
          );
          expectedTestNum = 1;

          if (objectClasses) {
            testCode = `${testCode}\n\n${objectClasses}`;
          }
        } else if (funcName) {
          const sourceCode =
            activeEditorLang === "typescript" && objectClasses
              ? `${objectClasses}\n\n${code}`
              : code;

          testCode = buildSharedTestCode(sourceCode, "", activeEditorLang, funcName, inputToUse);
        }

        try {
          const res = await CodeService.executeCode({
            language: activeEditorLang,
            code: testCode,
          });

          const actual = extractExecutionResult(res.output || res.error || "", expectedTestNum);
          const expected = expectedOutput.trim();
          const passed = compareSharedOutputs(
            normalizeComparableOutput(actual),
            normalizeComparableOutput(expected),
            {
              returnType: normalizedReturnType,
              returnSchema: normalizedReturnSchema,
            }
          );

          results.push({
            input: inputToUse || tc.input,
            expected: expectedOutput,
            actual: actual || "(пусто)",
            passed,
          });
        } catch (err: unknown) {
          results.push({
            input: inputToUse || tc.input,
            expected: expectedOutput,
            actual: `Ошибка: ${err instanceof Error ? err.message : String(err)}`,
            passed: false,
          });
        }
      }

      setTestResults(results);

      const allPassed = results.every((r) => r.passed);

      if (allPassed) {
        setCodeOutput(" Все тесты пройдены! Ограничения также соблюдены.");
      } else {
        const failedCount = results.filter((r) => !r.passed).length;

        setCodeOutput(` Провалено тестов: ${failedCount} из ${results.length}`);
      }
    } catch (err: unknown) {
      setCodeOutput(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunLoading(false);
    }
  };

  const filteredTasks =
    filterDifficulty === "all" ? tasks : tasks.filter((t) => t.difficulty === filterDifficulty);

  const difficultyBadge = (d: string) => {
    const info = DIFFICULTIES.find((dd) => dd.value === d);

    return (
      <span className={styles.badge} style={{ backgroundColor: info?.color || "#999" }}>
        {info?.label || d}
      </span>
    );
  };

  const langLabels = (langs: string[]) =>
    (langs || []).map((l) => LANGUAGES.find((ll) => ll.value === l)?.label || l).join(", ");

  if (view === "list") {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Задачи</h1>
            <Button
              color="#9F0FA7"
              width="300px"
              textColor="#fff"
              text="+ Создать задачу"
              onClick={handleCreate}
            />
          </div>

          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filterDifficulty === "all" ? styles.filterActive : ""}`}
              onClick={() => setFilterDifficulty("all")}
            >
              Все
            </button>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                className={`${styles.filterBtn} ${filterDifficulty === d.value ? styles.filterActive : ""}`}
                onClick={() => setFilterDifficulty(d.value)}
                style={
                  filterDifficulty === d.value ? { backgroundColor: d.color, color: "#fff" } : {}
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={styles.emptyText}>Загрузка...</p>
          ) : filteredTasks.length === 0 ? (
            <p className={styles.emptyText}>Нет задач. Создайте первую!</p>
          ) : (
            <div className={styles.taskList}>
              {filteredTasks.map((task) => (
                <div key={task.id} className={styles.taskCard}>
                  <div className={styles.taskCardHeader}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    <div className={styles.taskMeta}>
                      {difficultyBadge(task.difficulty)}
                      <span className={styles.xpBadge}>+{task.experienceReward} XP</span>
                    </div>
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
                  <div className={styles.taskFooter}>
                    <span className={styles.taskInfo}>
                      {langLabels(task.languages)} | {task.testCases?.length || 0} тестов | Автор:{" "}
                      {task.authorName}
                    </span>
                    <div className={styles.taskActions}>
                      <button className={styles.editBtn} onClick={() => handleEdit(task)}>
                        Редактировать
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(task.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{editId ? "Редактировать задачу" : "Создать задачу"}</h1>
          <div className={styles.headerActions}>
            <Button color="#666" textColor="#fff" text="Отмена" onClick={() => setView("list")} />
            <Button
              color="#9F0FA7"
              textColor="#fff"
              text={saving ? "Сохранение..." : "Сохранить"}
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formLeft}>
            <div className={styles.formGroup}>
              <label>Название задачи</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Two Sum"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Описание задачи</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Подробное описание задачи, примеры входных и выходных данных..."
                rows={6}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Имя функции для проверки</label>
              <input
                className={styles.input}
                value={functionName}
                onChange={(e) => updateConfiguredFunctionName(e.target.value)}
                placeholder={getSharedStarterFunctionName(activeEditorLang, functionName)}
              />
              <p style={{ marginTop: "6px", fontSize: "12px", color: "#666" }}>
                Если поле пустое, для старых задач будет выбрана первая найденная функция.
                Укажите имя явно, если в решении нужны вспомогательные функции выше основной.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Теги</label>
              <div className={styles.tagSelector}>
                {TAG_OPTIONS.map((tag) => {
                  const active = tags.includes(tag);

                  return (
                    <button
                      key={tag}
                      className={`${styles.tagChip} ${active ? styles.tagChipActive : ""}`}
                      onClick={() => toggleTag(tag)}
                      type="button"
                    >
                      {active ? "✓ " : ""}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Сложность</label>
                <select
                  className={styles.select}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Опыт (XP)</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={experienceReward}
                  onChange={(e) => setExperienceReward(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Языки программирования</label>
              <div className={styles.langChips}>
                {LANGUAGES.map((l) => {
                  const active = selectedLanguages.includes(l.value);

                  return (
                    <button
                      key={l.value}
                      className={`${styles.langChip} ${active ? styles.langChipActive : ""}`}
                      onClick={() => toggleLanguage(l.value)}
                      type="button"
                    >
                      {active ? "✓ " : ""}
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Стартовый код</label>
              <div className={styles.langTabs}>
                {selectedLanguages.map((lang) => {
                  const info = LANGUAGES.find((l) => l.value === lang);

                  return (
                    <button
                      key={lang}
                      className={`${styles.langTab} ${activeEditorLang === lang ? styles.langTabActive : ""}`}
                      onClick={() => {
                        setActiveEditorLang(lang);
                        setConstraintErrors([]);
                        setConstraintsPassed(null);
                        setTestResults(null);
                      }}
                      type="button"
                    >
                      {info?.label || lang}
                    </button>
                  );
                })}
              </div>
              <div className={styles.codeEditorWrap}>
                <CodeEditor
                  key={activeEditorLang}
                  value={startCodes[activeEditorLang] || ""}
                  onChange={(v) => updateStartCode(activeEditorLang, v)}
                  language={activeEditorLang}
                  height={250}
                  onRun={handleRunCode}
                  runLoading={runLoading}
                />
              </div>
              {constraintErrors.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "#ffebee",
                    borderRadius: "4px",
                  }}
                >
                  <strong style={{ color: "#c62828" }}>Нарушены ограничения:</strong>
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", color: "#c62828" }}>
                    {constraintErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {constraintsPassed === true && constraintErrors.length === 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "4px",
                    color: "#2e7d32",
                  }}
                >
            Ограничения пройдены
                </div>
              )}
              {testResults && (
                <div style={{ marginTop: "12px" }}>
                  <strong>Результаты тестов:</strong>
                  <div style={{ marginTop: "8px" }}>
                    {testResults.map((result, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "8px",
                          marginBottom: "4px",
                          backgroundColor: result.passed ? "#e8f5e9" : "#ffebee",
                          borderRadius: "4px",
                          borderLeft: `4px solid ${result.passed ? "#4caf50" : "#f44336"}`,
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>
                          Тест #{i + 1}: {result.passed ? "Пройден" : "Провален"}
                        </div>
                        <div style={{ fontSize: "12px", marginTop: "4px" }}>
                          Вход: {result.input} | Ожидалось: {result.expected} | Получено:{" "}
                          {result.actual}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {codeOutput && (
                <div className={styles.codeOutput}>
                  <strong>
                    Вывод ({LANGUAGES.find((l) => l.value === activeEditorLang)?.label}):
                  </strong>
                  <pre>{codeOutput}</pre>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <label style={{ fontWeight: "bold" }}>Схема аргументов</label>
                <Button
                  color="#9F0FA7"
                  width="300px"
                  textColor="#fff"
                  text="+ Добавить аргумент"
                  onClick={() => {
                    const defaultType = getDefaultArgumentTypeForLanguage(activeEditorLang);

                    setArgumentScheme((prev) => [
                      ...prev,
                      { name: `arg${prev.length + 1}`, type: defaultType },
                    ]);
                  }}
                />
              </div>

              {normalizedArgumentScheme.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ marginRight: "8px" }}>Тип возвращаемого значения:</label>
                    <select
                      className={styles.select}
                      value={normalizedReturnType}
                      onChange={(e) => {
                        const newReturnType = e.target.value as ArgumentType;
                        const nextReturnSchema = { ...(normalizedReturnSchema ?? {}) };

                        if (
                          newReturnType === "object" &&
                          !nextReturnSchema.objectFields &&
                          !nextReturnSchema.className
                        ) {
                          nextReturnSchema.objectFields = [createDefaultObjectField(0)];
                        }

                        if (newReturnType === "object" && !nextReturnSchema.objectReturnMode) {
                          nextReturnSchema.objectReturnMode = "generic";
                        }

                        if (
                          (newReturnType === "array" || newReturnType === "list") &&
                          !nextReturnSchema.arrayElementType
                        ) {
                          nextReturnSchema.arrayElementType =
                            activeSchemaConfig.defaultCollectionElementType;
                        }

                        if (
                          (newReturnType === "array" || newReturnType === "list") &&
                          nextReturnSchema.arrayElementType === "object" &&
                          !nextReturnSchema.arrayElementObjectFields
                        ) {
                          nextReturnSchema.arrayElementObjectFields = [createDefaultObjectField(0)];
                        }

                        updateReturnSchemaState(nextReturnSchema, newReturnType);
                      }}
                      style={{ width: "auto" }}
                    >
                      {activeSchemaConfig.returnTypes.map((typeOption) => (
                        <option key={typeOption.value} value={typeOption.value}>
                          {typeOption.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {normalizedReturnType === "object" && (
                    <div
                      style={{
                        marginBottom: "12px",
                        padding: "12px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "4px",
                      }}
                    >
                      {supportsConcreteObjectClasses ? (
                        <>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <span>Режим объекта:</span>
                            <select
                              className={styles.select}
                              value={getReturnObjectMode(normalizedReturnSchema)}
                              onChange={(e) =>
                                updateReturnSchemaState({
                                  ...(normalizedReturnSchema ?? {}),
                                  objectReturnMode: e.target.value as ReturnObjectMode,
                                  objectFields: normalizedReturnSchema?.objectFields ?? [
                                    createDefaultObjectField(0),
                                  ],
                                })
                              }
                              style={{ width: "auto" }}
                            >
                              <option value="generic">Общий object / Object</option>
                              <option value="concrete">Конкретный класс</option>
                            </select>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <span>Имя класса:</span>
                            <input
                              className={styles.input}
                              value={normalizedReturnSchema?.className ?? ""}
                              onChange={(e) =>
                                updateReturnSchemaState({
                                  ...(normalizedReturnSchema ?? {}),
                                  className: e.target.value,
                                  objectFields: normalizedReturnSchema?.objectFields ?? [
                                    createDefaultObjectField(0),
                                  ],
                                })
                              }
                              placeholder="Result"
                              style={{ width: "120px" }}
                            />
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            color: "#666",
                            fontSize: "12px",
                            marginBottom: "8px",
                          }}
                        >
                          Для этого языка результат трактуется как обычный объект / словарь / map.
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>Поля результата:</span>
                        <Button
                          color="#6a0f6e"
                          width="auto"
                          textColor="#fff"
                          text="+ Добавить поле"
                          onClick={() =>
                            updateReturnSchemaState({
                              ...(normalizedReturnSchema ?? {}),
                              objectFields: [
                                ...(normalizedReturnSchema?.objectFields ?? []),
                                createDefaultObjectField(
                                  (normalizedReturnSchema?.objectFields ?? []).length
                                ),
                              ],
                            })
                          }
                        />
                      </div>

                      {(normalizedReturnSchema?.objectFields ?? []).map((field, fieldIdx) => (
                        <div
                          key={fieldIdx}
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "6px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            className={styles.input}
                            value={field.name}
                            onChange={(e) => {
                              const fields = [...(normalizedReturnSchema?.objectFields ?? [])];

                              fields[fieldIdx] = { ...fields[fieldIdx], name: e.target.value };
                              updateReturnSchemaState({
                                ...(normalizedReturnSchema ?? {}),
                                objectFields: fields,
                              });
                            }}
                            placeholder="Имя поля"
                            style={{ width: "120px" }}
                          />
                          <select
                            className={styles.select}
                            value={field.type}
                            onChange={(e) => {
                              const fields = [...(normalizedReturnSchema?.objectFields ?? [])];

                              fields[fieldIdx] = {
                                ...fields[fieldIdx],
                                type: e.target.value as ArgumentType,
                              };
                              updateReturnSchemaState({
                                ...(normalizedReturnSchema ?? {}),
                                objectFields: fields,
                              });
                            }}
                            style={{ width: "auto" }}
                          >
                            {activeSchemaConfig.objectFieldTypes.map((typeOption) => (
                              <option key={typeOption.value} value={typeOption.value}>
                                {typeOption.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const fields = [...(normalizedReturnSchema?.objectFields ?? [])];

                              fields.splice(fieldIdx, 1);
                              updateReturnSchemaState({
                                ...(normalizedReturnSchema ?? {}),
                                objectFields: fields,
                              });
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "red",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {normalizedArgumentScheme.map((arg, i) => {
                    return (
                      <div
                        key={i}
                        style={{
                          padding: "12px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span style={{ fontWeight: "bold" }}>Аргумент #{i + 1}</span>
                          <button
                            onClick={() =>
                              setArgumentScheme((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            style={{
                              marginLeft: "auto",
                              background: "none",
                              border: "none",
                              color: "red",
                              cursor: "pointer",
                            }}
                          >
                            ✕ Удалить
                          </button>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <input
                            className={styles.input}
                            value={arg.name}
                            onChange={(e) => {
                              const newScheme = [...normalizedArgumentScheme];

                              newScheme[i].name = e.target.value;
                              setArgumentScheme(newScheme);
                            }}
                            placeholder="Имя аргумента"
                            style={{ width: "120px" }}
                          />
                          <select
                            className={styles.select}
                            value={arg.type}
                            onChange={(e) => {
                              const newType = e.target.value as ArgumentType;
                              const newScheme = [...normalizedArgumentScheme];

                              newScheme[i].type = newType;

                              if (newType === "object" && !newScheme[i].objectFields) {
                                newScheme[i].objectFields = [createDefaultObjectField(0)];
                              } else if (newType !== "object") {
                                newScheme[i].className = undefined;
                                newScheme[i].objectFields = undefined;
                              }

                              if (
                                (newType === "array" || newType === "list") &&
                                !newScheme[i].arrayElementType
                              ) {
                                newScheme[i].arrayElementType =
                                  activeSchemaConfig.defaultCollectionElementType;
                              } else if (newType !== "array" && newType !== "list") {
                                newScheme[i].arrayElementType = undefined;
                                newScheme[i].arrayElementClassName = undefined;
                                newScheme[i].arrayElementObjectFields = undefined;
                              }

                              setArgumentScheme(newScheme);
                            }}
                            style={{ width: "auto" }}
                          >
                            {activeSchemaConfig.argumentTypes.map((typeOption) => (
                              <option key={typeOption.value} value={typeOption.value}>
                                {typeOption.label}
                              </option>
                            ))}
                          </select>

                          {arg.type === "object" && (
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "8px",
                                backgroundColor: "#fff",
                                borderRadius: "4px",
                                width: "100%",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginBottom: "8px",
                                }}
                              >
                                {supportsConcreteObjectClasses && (
                                  <>
                                    <span>Имя класса:</span>
                                    <input
                                      className={styles.input}
                                      value={arg.className || ""}
                                      onChange={(e) => {
                                        const newScheme = [...normalizedArgumentScheme];

                                        newScheme[i].className = e.target.value;
                                        setArgumentScheme(newScheme);
                                      }}
                                      placeholder="Person"
                                      style={{ width: "120px" }}
                                    />
                                  </>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>Поля объекта:</span>
                                <Button
                                  color="#6a0f6e"
                                  width="auto"
                                  textColor="#fff"
                                  text="+ Добавить поле"
                                  onClick={() => {
                                    const newScheme = [...normalizedArgumentScheme];

                                    if (!newScheme[i].objectFields) {
                                      newScheme[i].objectFields = [];
                                    }

                                    newScheme[i].objectFields!.push(
                                      createDefaultObjectField(newScheme[i].objectFields!.length)
                                    );
                                    setArgumentScheme(newScheme);
                                  }}
                                />
                              </div>
                              {(arg.objectFields || []).map((field, fieldIdx) => (
                                <div
                                  key={fieldIdx}
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    marginTop: "4px",
                                    alignItems: "center",
                                  }}
                                >
                                  <input
                                    className={styles.input}
                                    value={field.name}
                                    onChange={(e) => {
                                      const newScheme = [...normalizedArgumentScheme];

                                      newScheme[i].objectFields![fieldIdx].name = e.target.value;
                                      setArgumentScheme(newScheme);
                                    }}
                                    placeholder="Имя поля"
                                    style={{ width: "100px" }}
                                  />
                                  <select
                                    className={styles.select}
                                    value={field.type}
                                    onChange={(e) => {
                                      const newScheme = [...normalizedArgumentScheme];

                                      newScheme[i].objectFields![fieldIdx].type = e.target
                                        .value as ArgumentType;
                                      setArgumentScheme(newScheme);
                                    }}
                                    style={{ width: "auto" }}
                                  >
                                    {activeSchemaConfig.objectFieldTypes.map((typeOption) => (
                                      <option key={typeOption.value} value={typeOption.value}>
                                        {typeOption.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      const newScheme = [...normalizedArgumentScheme];

                                      newScheme[i].objectFields!.splice(fieldIdx, 1);
                                      setArgumentScheme(newScheme);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "red",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {(arg.type === "array" || arg.type === "list") && (
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "8px",
                                backgroundColor: "#fff",
                                borderRadius: "4px",
                                width: "100%",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>Тип элементов массива:</span>
                                <select
                                  className={styles.select}
                                  value={
                                    arg.arrayElementType ||
                                    activeSchemaConfig.defaultCollectionElementType
                                  }
                                  onChange={(e) => {
                                    const newScheme = [...normalizedArgumentScheme];

                                    newScheme[i].arrayElementType = e.target.value as ArgumentType;

                                    if (e.target.value !== "object") {
                                      newScheme[i].arrayElementClassName = undefined;
                                      newScheme[i].arrayElementObjectFields = undefined;
                                    }

                                    setArgumentScheme(newScheme);
                                  }}
                                  style={{ width: "auto" }}
                                >
                                  {activeSchemaConfig.collectionElementTypes.map((typeOption) => (
                                    <option key={typeOption.value} value={typeOption.value}>
                                      {typeOption.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {arg.arrayElementType === "object" && (
                                <div style={{ marginTop: "8px" }}>
                                  {supportsConcreteObjectClasses && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <span>Имя класса элемента:</span>
                                      <input
                                        className={styles.input}
                                        value={arg.arrayElementClassName || ""}
                                        onChange={(e) => {
                                          const newScheme = [...normalizedArgumentScheme];

                                          newScheme[i].arrayElementClassName = e.target.value;
                                          setArgumentScheme(newScheme);
                                        }}
                                        placeholder="Person"
                                        style={{ width: "120px" }}
                                      />
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      marginTop: "8px",
                                    }}
                                  >
                                    <span>Поля элемента объекта:</span>
                                    <Button
                                      color="#6a0f6e"
                                      width="auto"
                                      textColor="#fff"
                                      text="+ Добавить поле"
                                      onClick={() => {
                                        const newScheme = [...normalizedArgumentScheme];

                                        if (!newScheme[i].arrayElementObjectFields) {
                                          newScheme[i].arrayElementObjectFields = [];
                                        }

                                        newScheme[i].arrayElementObjectFields!.push(
                                          createDefaultObjectField(
                                            newScheme[i].arrayElementObjectFields!.length
                                          )
                                        );
                                        setArgumentScheme(newScheme);
                                      }}
                                    />
                                  </div>
                                  {(arg.arrayElementObjectFields || []).map((field, fieldIdx) => (
                                    <div
                                      key={fieldIdx}
                                      style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginTop: "4px",
                                        alignItems: "center",
                                      }}
                                    >
                                      <input
                                        className={styles.input}
                                        value={field.name}
                                        onChange={(e) => {
                                          const newScheme = [...normalizedArgumentScheme];

                                          newScheme[i].arrayElementObjectFields![fieldIdx].name =
                                            e.target.value;
                                          setArgumentScheme(newScheme);
                                        }}
                                        placeholder="Имя поля"
                                        style={{ width: "100px" }}
                                      />
                                      <select
                                        className={styles.select}
                                        value={field.type}
                                        onChange={(e) => {
                                          const newScheme = [...normalizedArgumentScheme];

                                          newScheme[i].arrayElementObjectFields![fieldIdx].type = e
                                            .target.value as ArgumentType;
                                          setArgumentScheme(newScheme);
                                        }}
                                        style={{ width: "auto" }}
                                      >
                                        {activeSchemaConfig.objectFieldTypes.map((typeOption) => (
                                          <option key={typeOption.value} value={typeOption.value}>
                                            {typeOption.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => {
                                          const newScheme = [...normalizedArgumentScheme];

                                          newScheme[i].arrayElementObjectFields!.splice(
                                            fieldIdx,
                                            1
                                          );
                                          setArgumentScheme(newScheme);
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "red",
                                          cursor: "pointer",
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    color="#4caf50"
                    width="300px"
                    textColor="#fff"
                    text="Обновить стартовый код"
                    onClick={() => {
                      const newCodes: Record<string, string> = {};

                      selectedLanguages.forEach((lang) => {
                        newCodes[lang] = buildStarterCodeForLanguage(
                          lang as CodeLanguage,
                          argumentScheme,
                          returnType,
                          returnSchema,
                          functionName
                        );
                      });
                      setStartCodes((prev) => ({ ...prev, ...newCodes }));
                    }}
                  />
                </div>
              )}

              {normalizedArgumentScheme.length === 0 && (
                <p style={{ color: "#666", fontSize: "14px" }}>
                  Добавьте аргументы для создания типизированной функции с автоматической генерацией
                  стартового кода.
                </p>
              )}
            </div>
          </div>

          <div className={styles.formRight}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Тест-кейсы (по языкам)</h3>
                <Button
                  color="#9F0FA7"
                  width="300px"
                  textColor="#fff"
                  text="+ Добавить"
                  onClick={addTestCase}
                />
              </div>

              {selectedLanguages.length > 1 && (
                <div className={styles.langTabs} style={{ marginBottom: "12px" }}>
                  {selectedLanguages.map((lang) => {
                    const info = LANGUAGES.find((l) => l.value === lang);
                    const hasTests = testCasesByLanguage[lang]?.length > 0;

                    return (
                      <button
                        key={lang}
                        className={`${styles.langTab} ${activeTestLang === lang ? styles.langTabActive : ""}`}
                        onClick={() => setActiveTestLang(lang)}
                        type="button"
                        style={
                          activeTestLang === lang
                            ? { backgroundColor: "#9F0FA7", color: "#fff" }
                            : {}
                        }
                      >
                        {info?.label || lang} {hasTests && `(${testCasesByLanguage[lang].length})`}
                      </button>
                    );
                  })}
                </div>
              )}

              {(() => {
                const lang = activeTestLang || selectedLanguages[0];
                const currentTestCases = testCasesByLanguage[lang] || [];
                const schemeForLang = normalizeArgumentSchemeForLanguage(
                  argumentScheme,
                  lang as CodeLanguage
                );
                const returnForLang = normalizeReturnSchemaForLanguage(
                  returnType,
                  returnSchema,
                  lang as CodeLanguage
                );
                const hasArgScheme = schemeForLang.length > 0;

                if (currentTestCases.length === 0) {
                  return (
                    <p className={styles.emptyHint}>
                      Добавьте тест-кейсы для языка{" "}
                      {LANGUAGES.find((l) => l.value === lang)?.label || lang}
                    </p>
                  );
                }

                return currentTestCases.map((tc, i) => (
                  <div key={i} className={styles.testCase}>
                    <div className={styles.testCaseHeader}>
                      <span className={styles.testCaseTitle}>
                        Тест #{i + 1} ({LANGUAGES.find((l) => l.value === lang)?.label || lang})
                      </span> {' '}
                      <button className={styles.deleteButton} onClick={() => deleteTestCase(i)}>
                        ✕
                      </button>
                    </div>

                    {hasArgScheme ? (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ fontWeight: "bold", marginBottom: "4px", display: "block" }}>
                          Значения аргументов:
                        </span>
                        {schemeForLang.map((arg, argIdx) => (
                          <div key={argIdx} style={{ marginBottom: "8px", marginLeft: "8px" }}>
                            <span style={{ minWidth: "80px", display: "inline-block" }}>
                              {arg.name} ({getTypeString(arg.type as ArgumentType, lang as CodeLanguage) || arg.type}):
                            </span>

                            {arg.type === "object" && arg.objectFields ? (
                              <div
                                style={{
                                  marginLeft: "16px",
                                  padding: "4px",
                                  backgroundColor: "#f5f5f5",
                                  borderRadius: "4px",
                                }}
                              >
                                {arg.objectFields.map((field, fieldIdx) => (
                                  <div
                                    key={fieldIdx}
                                    style={{
                                      display: "flex",
                                      gap: "4px",
                                      alignItems: "center",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    <span style={{ fontSize: "12px" }}>{field.name}:</span>
                                    <input
                                      className={styles.input}
                                      value={tc.args?.[argIdx]?.objectValues?.[field.name] ?? ""}
                                      onChange={(e) =>
                                        updateTestCaseArgObjectValue(
                                          i,
                                          argIdx,
                                          field.name,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`значение ${field.type}`}
                                      style={{ width: "100px" }}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <input
                                className={styles.input}
                                value={tc.args?.[argIdx]?.value ?? ""}
                                onChange={(e) => updateTestCaseArgValue(i, argIdx, e.target.value)}
                              placeholder={
                                arg.type === "object"
                                  ? '{key: "value"}'
                                    : getTypeString(arg.type as ArgumentType, lang as CodeLanguage) ||
                                      arg.type
                                }
                                style={{ width: "200px" }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        className={styles.input}
                        value={tc.input}
                        onChange={(e) => updateTestCaseInput(i, e.target.value)}
                        placeholder="Входные данные: 1, 'test', [1,2,3], true"
                      />
                    )}

                    {returnForLang.returnType === "object" && returnForLang.returnSchema?.objectFields ? (
                      <div style={{ marginTop: "8px" }}>
                        <span style={{ fontWeight: "bold", marginBottom: "4px", display: "block" }}>
                          Ожидаемый объект:
                        </span>
                        {returnForLang.returnSchema.objectFields.map((field, fieldIdx) => (
                          <div
                            key={fieldIdx}
                            style={{
                              display: "flex",
                              gap: "4px",
                              alignItems: "center",
                              marginBottom: "4px",
                            }}
                          >
                            <span style={{ fontSize: "12px", minWidth: "80px" }}>
                              {field.name}:
                            </span>
                            <input
                              className={styles.input}
                              value={tc.expectedObjectValues?.[field.name] ?? ""}
                              onChange={(e) =>
                                updateTestCaseExpectedObjectValue(i, field.name, e.target.value)
                              }
                              placeholder={`значение ${field.type}`}
                              style={{ width: "140px" }}
                            />
                          </div>
                        ))}
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                          JSON результата:{" "}
                          {getExpectedOutputValue(
                            tc,
                            returnForLang.returnType,
                            returnForLang.returnSchema
                          ) || "не заполнен"}
                        </div>
                      </div>
                    ) : (
                      <input
                        className={styles.input}
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCaseExpected(i, e.target.value)}
                        placeholder="Ожидаемый результат: [0,1]"
                      />
                    )}
                  </div>
                ));
              })()}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Ограничения</h3>
                <Button
                  color="#9F0FA7"
                  width="300px"
                  textColor="#fff"
                  text="+ Добавить"
                  onClick={addConstraint}
                />
              </div>
              {constraints.map((c, i) => (
                <div key={i} className={styles.constraint}>
                  <div className={styles.constraintHeader}>
                    <select
                      className={styles.select}
                      value={c.type}
                      onChange={(e) => {
                        const t = e.target.value as CodeConstraintType;
                        let val: number | string[] | boolean = 1000;

                        if (t === "maxLines") val = 30;

                        if (t === "forbiddenTokens" || t === "requiredKeywords") val = [];

                        if (t === "noComments" || t === "noConsoleLog") val = true;

                        if (t === "maxComplexity") val = 5;

                        if (t === "memoryLimit") val = 256;

                        updateConstraint(i, t, val);
                      }}
                    >
                      <option value="maxTimeMs">Время (мс)</option>
                      <option value="maxLines">Макс. строк</option>
                      <option value="forbiddenTokens">Запрещённые слова</option>
                      <option value="noComments">Без комментариев</option>
                      <option value="noConsoleLog">Без console.log</option>
                      <option value="maxComplexity">Макс. сложность</option>
                      <option value="memoryLimit">Память (МБ)</option>
                      <option value="requiredKeywords">Обязат. слова</option>
                    </select>
                    <button className={styles.deleteButton} onClick={() => deleteConstraint(i)}>
                      ✕
                    </button>
                  </div>
                  {typeof c.value === "number" && (
                    <input
                      className={styles.input}
                      type="number"
                      value={c.value}
                      onChange={(e) => updateConstraint(i, c.type, Number(e.target.value))}
                    />
                  )}
                  {Array.isArray(c.value) && (
                    <input
                      className={styles.input}
                      value={(c.value as string[]).join(", ")}
                      onChange={(e) =>
                        updateConstraint(
                          i,
                          c.type,
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Через запятую: eval, exec"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
