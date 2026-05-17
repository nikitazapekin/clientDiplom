/* eslint-disable */

import { useEffect, useRef, type ChangeEvent } from "react";

import Button from "../Button";

import styles from "./index.module.scss";
import {
  buildExpectedObjectOutput,
  getArrayTypeString,
  getDefaultStarterCode,
  getEffectiveReturnObjectMode,
  getExpectedOutputFromTestCase,
  getListTypeString,
  getStarterFunctionName,
  getTypeString,
  stripMainMethod,
} from "./codeUtils";
import { LANGUAGES, StableCodeEditor } from "./editorShared";
import {
  getDefaultArgumentTypeForLanguage,
  getDefaultReturnTypeForLanguage,
  getLanguageSchemaConfig,
  normalizeArgumentSchemeForLanguage,
  normalizeReturnSchemaForLanguage,
} from "./schemaBuilderConfig";
import {
  createEmptyFillTaskCase,
  extractFillTaskInputs,
  getFillTaskCaseOptionId,
  normalizeFillTaskBlock,
  syncFillTaskTestCases,
} from "./fillTaskUtils";
import type {
  ArgumentSchema,
  ArgumentType,
  CodeConstraintType,
  FillCodeLanguage,
  ReturnObjectMode,
  ReturnSchema,
  SlideBlock,
  CodeTaskTestCase,
} from "./types";

import type { CodeLanguage } from "@/app/http/codeService";

const FILL_TASK_LANGUAGES: { value: FillCodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
];

const createFillTaskCaseId = () =>
  `fill_case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createFillTaskOptionId = () =>
  `fill_option_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export function BlockEditor({
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

  useEffect(() => {
    if (block.type !== "codeTask") {
      return;
    }

    const language = block.language ?? "javascript";
    const normalizedArgumentScheme = normalizeArgumentSchemeForLanguage(
      block.argumentScheme ?? [],
      language
    );
    const normalizedReturn = normalizeReturnSchemaForLanguage(
      block.returnType ?? getDefaultReturnTypeForLanguage(language),
      block.returnSchema,
      language
    );

    const currentArgumentScheme = block.argumentScheme ?? [];
    const hasArgumentSchemeChanges =
      JSON.stringify(currentArgumentScheme) !== JSON.stringify(normalizedArgumentScheme);
    const hasReturnTypeChanges =
      (block.returnType ?? getDefaultReturnTypeForLanguage(language)) !== normalizedReturn.returnType;
    const hasReturnSchemaChanges =
      JSON.stringify(block.returnSchema ?? null) !== JSON.stringify(normalizedReturn.returnSchema ?? null);

    if (hasArgumentSchemeChanges || hasReturnTypeChanges || hasReturnSchemaChanges) {
      updateBlock(slideIndex, block.id, {
        argumentScheme: normalizedArgumentScheme,
        returnType: normalizedReturn.returnType,
        returnSchema: normalizedReturn.returnSchema,
      });
    }
  }, [block, slideIndex, updateBlock]);

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
          {LANGUAGES.map((languageOption) => (
            <option key={languageOption.value} value={languageOption.value}>
              {languageOption.label}
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
          onChange={(value) => updateBlock(slideIndex, block.id, { code: value })}
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
    const setCell = (rowIndex: number, columnIndex: number, value: string) => {
      const cells = block.cells.map((row, currentRowIndex) =>
        row.map((cell, currentColumnIndex) =>
          currentRowIndex === rowIndex && currentColumnIndex === columnIndex ? value : cell
        )
      );
      updateBlock(slideIndex, block.id, { cells });
    };

    const setSize = (rows: number, cols: number) => {
      const cells: string[][] = [];
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        cells[rowIndex] = [];
        for (let columnIndex = 0; columnIndex < cols; columnIndex++) {
          cells[rowIndex][columnIndex] = block.cells[rowIndex]?.[columnIndex] ?? "";
        }
      }
      updateBlock(slideIndex, block.id, { rows, cols, cells });
    };

    return (
      <div className={styles.blockEditor}>
        <div className={styles.tableControls}>
          <span>Строк:</span>
          <select value={block.rows} onChange={(e) => setSize(Number(e.target.value), block.cols)}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span>Столбцов:</span>
          <select value={block.cols} onChange={(e) => setSize(block.rows, Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <tbody>
              {block.cells.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, columnIndex) => (
                    <td key={columnIndex}>
                      <input
                        value={cell}
                        onChange={(e) => setCell(rowIndex, columnIndex, e.target.value)}
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
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
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
    const language = block.language ?? "javascript";
    const languageConfig = getLanguageSchemaConfig(language);
    const supportsConcreteObjectClasses = languageConfig.supportsConcreteObjectClasses;
    const argumentTypes = languageConfig.argumentTypes;
    const returnTypes = languageConfig.returnTypes;
    const objectFieldTypes = languageConfig.objectFieldTypes;
    const collectionElementTypes = languageConfig.collectionElementTypes;
    const argumentScheme = normalizeArgumentSchemeForLanguage(block.argumentScheme ?? [], language);
    const normalizedReturnState = normalizeReturnSchemaForLanguage(
      block.returnType ?? getDefaultReturnTypeForLanguage(language),
      block.returnSchema,
      language
    );
    const returnType = normalizedReturnState.returnType;
    const returnSchema = normalizedReturnState.returnSchema;
    const hasArgumentScheme = argumentScheme.length > 0;
    const buildStarterCode = (
      nextLanguage: CodeLanguage = language,
      nextArgumentScheme: ArgumentSchema[] = argumentScheme,
      nextReturnType: ArgumentType = returnType,
      nextReturnSchema: ReturnSchema | undefined = returnSchema,
      functionName: string | undefined = block.functionName
    ) =>
      getDefaultStarterCode(
        nextLanguage,
        nextArgumentScheme,
        nextReturnType,
        nextReturnSchema,
        functionName
      );
    const getReturnObjectMode = (
      nextReturnSchema: ReturnSchema | undefined = returnSchema
    ): ReturnObjectMode => getEffectiveReturnObjectMode(nextReturnSchema);
    const displayedFunctionName = block.functionName?.trim()
      ? block.functionName.trim()
      : getStarterFunctionName(language);

    const updateFunctionName = (value: string) => {
      const currentStartCode = block.startCode ?? "";
      const currentGeneratedCode = buildStarterCode(
        language,
        argumentScheme,
        returnType,
        returnSchema,
        block.functionName
      );
      const nextGeneratedCode = buildStarterCode(
        language,
        argumentScheme,
        returnType,
        returnSchema,
        value
      );

      updateBlock(slideIndex, block.id, {
        functionName: value,
        startCode:
          !currentStartCode.trim() || currentStartCode === currentGeneratedCode
            ? nextGeneratedCode
            : currentStartCode,
      });
    };

    const syncTestCasesWithReturnSchema = (
      testCases: CodeTaskTestCase[] | undefined,
      returnType: ArgumentType,
      returnSchema: ReturnSchema | undefined
    ): CodeTaskTestCase[] => {
      return (testCases ?? []).map((testCase) => {
        if (returnType !== "object") {
          return testCase;
        }

        return {
          ...testCase,
          expectedOutput: getExpectedOutputFromTestCase(testCase, returnType, returnSchema),
        };
      });
    };

    const updateReturnSchema = (nextReturnSchema: ReturnSchema) => {
      const normalizedNextReturn = normalizeReturnSchemaForLanguage(
        returnType,
        nextReturnSchema,
        language
      );
      const nextTestCases = syncTestCasesWithReturnSchema(
        block.testCases,
        normalizedNextReturn.returnType,
        normalizedNextReturn.returnSchema
      );

      updateBlock(slideIndex, block.id, {
        testCases: nextTestCases,
        returnType: normalizedNextReturn.returnType,
        returnSchema: normalizedNextReturn.returnSchema,
        startCode: buildStarterCode(
          language,
          argumentScheme,
          normalizedNextReturn.returnType,
          normalizedNextReturn.returnSchema
        ),
      });
    };

    const createDefaultObjectField = (index: number) => ({
      name: `field${index + 1}`,
      type: languageConfig.objectFieldTypes[0]?.value ?? ("string" as ArgumentType),
      value: "",
    });

    const getValueExampleForType = (type: ArgumentType): string => {
      switch (type) {
        case "string":
          return '"text"';
        case "boolean":
          return "true";
        case "char":
          return '"a"';
        default:
          return "1";
      }
    };

    const getReturnOutputExample = (): string => {
      if (returnType === "object" && returnSchema?.objectFields) {
        const fields = returnSchema.objectFields
          .map((field) => `"${field.name}": ${getValueExampleForType(field.type)}`)
          .join(", ");
        return `{${fields}}`;
      }

      if (returnType === "array" || returnType === "list") {
        const elementType = returnSchema?.arrayElementType ?? "object";
        if (elementType === "object" && returnSchema?.arrayElementObjectFields) {
          const fields = returnSchema.arrayElementObjectFields
            .map((field) => `"${field.name}": ${getValueExampleForType(field.type)}`)
            .join(", ");
          return `[{${fields}}]`;
        }

        if (elementType === "string") return '["text"]';
        if (elementType === "boolean") return "[true]";
        return "[1]";
      }

      return "Ожидаемый возврат";
    };

    const addTestCase = () => {
      const testCases = [...(block.testCases ?? []), { input: "", expectedOutput: "", args: [] }];
      updateBlock(slideIndex, block.id, { testCases });
    };

    const updateTestCaseInput = (index: number, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[index]) testCases[index] = { input: "", expectedOutput: "", args: [] };
      testCases[index].input = value;
      updateBlock(slideIndex, block.id, { testCases });
    };

    const updateTestCaseExpected = (index: number, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[index]) testCases[index] = { input: "", expectedOutput: "", args: [] };
      testCases[index].expectedOutput = value;
      updateBlock(slideIndex, block.id, { testCases });
    };

    const updateTestCaseExpectedObjectValue = (
      testCaseIndex: number,
      fieldName: string,
      value: string
    ) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[testCaseIndex]) {
        testCases[testCaseIndex] = { input: "", expectedOutput: "", args: [] };
      }

      const expectedObjectValues = {
        ...(testCases[testCaseIndex].expectedObjectValues ?? {}),
        [fieldName]: value,
      };

      testCases[testCaseIndex] = {
        ...testCases[testCaseIndex],
        expectedObjectValues,
        expectedOutput: buildExpectedObjectOutput(expectedObjectValues, returnSchema),
      };

      updateBlock(slideIndex, block.id, { testCases });
    };

    const updateTestCaseArgValue = (testCaseIndex: number, argIndex: number, value: string) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[testCaseIndex]) {
        testCases[testCaseIndex] = { input: "", expectedOutput: "", args: [] };
      }
      if (!testCases[testCaseIndex].args) {
        testCases[testCaseIndex].args = [];
      }
      if (!testCases[testCaseIndex].args![argIndex]) {
        testCases[testCaseIndex].args![argIndex] = {
          index: argIndex,
          value: "",
          objectValues: {},
        };
      }
      testCases[testCaseIndex].args![argIndex].value = value;
      updateBlock(slideIndex, block.id, { testCases });
    };

    const updateTestCaseArgObjectValue = (
      testCaseIndex: number,
      argIndex: number,
      fieldName: string,
      value: string
    ) => {
      const testCases = [...(block.testCases ?? [])];
      if (!testCases[testCaseIndex]) {
        testCases[testCaseIndex] = { input: "", expectedOutput: "", args: [] };
      }
      if (!testCases[testCaseIndex].args) {
        testCases[testCaseIndex].args = [];
      }
      if (!testCases[testCaseIndex].args![argIndex]) {
        testCases[testCaseIndex].args![argIndex] = {
          index: argIndex,
          value: "",
          objectValues: {},
        };
      }
      if (!testCases[testCaseIndex].args![argIndex].objectValues) {
        testCases[testCaseIndex].args![argIndex].objectValues = {};
      }
      testCases[testCaseIndex].args![argIndex].objectValues![fieldName] = value;
      updateBlock(slideIndex, block.id, { testCases });
    };

    const deleteTestCase = (index: number) => {
      const testCases = [...(block.testCases ?? [])];
      testCases.splice(index, 1);
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
      index: number,
      type: CodeConstraintType,
      value: number | string[] | boolean
    ) => {
      const constraints = [...(block.constraints ?? [])];
      if (!constraints[index]) {
        constraints[index] = { type: "maxTimeMs", value: 1000 };
      }
      constraints[index] = { type, value };
      updateBlock(slideIndex, block.id, { constraints });
    };

    const deleteConstraint = (index: number) => {
      const constraints = [...(block.constraints ?? [])];
      constraints.splice(index, 1);
      updateBlock(slideIndex, block.id, { constraints });
    };

    const updateArgSchemeType = (index: number, newType: ArgumentType) => {
      const scheme = [...argumentScheme];
      if (!scheme[index]) {
        scheme[index] = {
          name: `arg${index + 1}`,
          type: getDefaultArgumentTypeForLanguage(language),
        };
      }
      scheme[index].type = newType;

      if (newType === "object") {
        scheme[index].objectFields = scheme[index].objectFields ?? [
          createDefaultObjectField(0),
        ];
      } else {
        delete scheme[index].objectFields;
        delete scheme[index].className;
      }

      if (newType === "array" || newType === "list") {
        scheme[index].arrayElementType =
          scheme[index].arrayElementType ?? languageConfig.defaultCollectionElementType;
      } else {
        delete scheme[index].arrayElementType;
        delete scheme[index].arrayElementClassName;
        delete scheme[index].arrayElementObjectFields;
      }

      updateBlock(slideIndex, block.id, {
        argumentScheme: scheme,
        startCode: buildStarterCode(language, scheme, returnType, returnSchema),
      });
    };

    const updateArgSchemeName = (index: number, name: string) => {
      const scheme = [...argumentScheme];
      if (!scheme[index]) {
        scheme[index] = {
          name: `arg${index + 1}`,
          type: getDefaultArgumentTypeForLanguage(language),
        };
      }
      scheme[index].name = name;
      updateBlock(slideIndex, block.id, {
        argumentScheme: scheme,
        startCode: buildStarterCode(language, scheme, returnType, returnSchema),
      });
    };

    const setArgSchemeCount = (count: number) => {
      const newScheme = [...argumentScheme];
      const defaultType = getDefaultArgumentTypeForLanguage(language);

      while (newScheme.length < count) {
        newScheme.push({ name: `arg${newScheme.length + 1}`, type: defaultType });
      }
      while (newScheme.length > count) {
        newScheme.pop();
      }

      updateBlock(slideIndex, block.id, {
        argumentScheme: newScheme,
        startCode: buildStarterCode(language, newScheme, returnType, returnSchema),
      });
    };

    const updateObjectFieldType = (
      argIndex: number,
      fieldIndex: number,
      fieldType: ArgumentType
    ) => {
      const scheme = [...argumentScheme];
      if (scheme[argIndex]?.objectFields?.[fieldIndex]) {
        scheme[argIndex].objectFields![fieldIndex].type = fieldType;
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(language, scheme, returnType, returnSchema),
        });
      }
    };

    const addObjectFieldToScheme = (argIndex: number) => {
      const scheme = [...argumentScheme];
      if (scheme[argIndex]) {
        if (!scheme[argIndex].objectFields) {
          scheme[argIndex].objectFields = [];
        }
        scheme[argIndex].objectFields!.push(createDefaultObjectField(scheme[argIndex].objectFields!.length));
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(language, scheme, returnType, returnSchema),
        });
      }
    };

    const deleteObjectFieldFromScheme = (argIndex: number, fieldIndex: number) => {
      const scheme = [...argumentScheme];
      if (scheme[argIndex]?.objectFields) {
        scheme[argIndex].objectFields!.splice(fieldIndex, 1);
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(language, scheme, returnType, returnSchema),
        });
      }
    };

    const updateArrayElementType = (argIndex: number, elementType: ArgumentType) => {
      const scheme = [...argumentScheme];
      if (scheme[argIndex]) {
        scheme[argIndex].arrayElementType = elementType;
        if (elementType === "object") {
          scheme[argIndex].arrayElementObjectFields = scheme[argIndex].arrayElementObjectFields ?? [
            createDefaultObjectField(0),
          ];
        } else {
          delete scheme[argIndex].arrayElementObjectFields;
          delete scheme[argIndex].arrayElementClassName;
        }
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(language, scheme, returnType, returnSchema),
        });
      }
    };

    const addArrayElementObjectField = (argIndex: number) => {
      const scheme = [...argumentScheme];
      if (scheme[argIndex]?.arrayElementObjectFields) {
        scheme[argIndex].arrayElementObjectFields!.push(
          createDefaultObjectField(scheme[argIndex].arrayElementObjectFields!.length)
        );
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(language, scheme, returnType, returnSchema),
        });
      }
    };

    const updateArrayElementObjectField = (
      argIndex: number,
      fieldIndex: number,
      fieldName: string,
      fieldType: ArgumentType
    ) => {
      const scheme = [...argumentScheme];
      if (scheme[argIndex]?.arrayElementObjectFields?.[fieldIndex]) {
        scheme[argIndex].arrayElementObjectFields![fieldIndex].name = fieldName;
        scheme[argIndex].arrayElementObjectFields![fieldIndex].type = fieldType;
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(language, scheme, returnType, returnSchema),
        });
      }
    };

    const updateReturnObjectFieldType = (fieldIndex: number, fieldType: ArgumentType) => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.objectFields ?? [])];
      if (fields[fieldIndex]) {
        fields[fieldIndex] = { ...fields[fieldIndex], type: fieldType };
        nextReturnSchema.objectFields = fields;
        updateReturnSchema(nextReturnSchema);
      }
    };

    const addReturnObjectField = () => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.objectFields ?? [])];
      fields.push(createDefaultObjectField(fields.length));
      nextReturnSchema.objectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const deleteReturnObjectField = (fieldIndex: number) => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.objectFields ?? [])];
      fields.splice(fieldIndex, 1);
      nextReturnSchema.objectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const updateReturnArrayElementType = (elementType: ArgumentType) => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      nextReturnSchema.arrayElementType = elementType;

      if (elementType === "object") {
        nextReturnSchema.arrayElementObjectFields = nextReturnSchema.arrayElementObjectFields ?? [
          createDefaultObjectField(0),
        ];
      } else {
        delete nextReturnSchema.arrayElementObjectFields;
      }

      updateReturnSchema(nextReturnSchema);
    };

    const addReturnArrayElementObjectField = () => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.arrayElementObjectFields ?? [])];
      fields.push(createDefaultObjectField(fields.length));
      nextReturnSchema.arrayElementObjectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const updateReturnArrayElementObjectField = (
      fieldIndex: number,
      fieldName: string,
      fieldType: ArgumentType
    ) => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.arrayElementObjectFields ?? [])];
      if (fields[fieldIndex]) {
        fields[fieldIndex] = { ...fields[fieldIndex], name: fieldName, type: fieldType };
        nextReturnSchema.arrayElementObjectFields = fields;
        updateReturnSchema(nextReturnSchema);
      }
    };

    const deleteReturnArrayElementObjectField = (fieldIndex: number) => {
      const nextReturnSchema = { ...(returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.arrayElementObjectFields ?? [])];
      fields.splice(fieldIndex, 1);
      nextReturnSchema.arrayElementObjectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const getTypeStringForArg = (arg: ArgumentSchema): string => {
      if (arg.type === "array") {
        return getArrayTypeString(arg, language);
      }

      if (arg.type === "list") {
        return getListTypeString(arg, language);
      }

      if (arg.type === "object" && supportsConcreteObjectClasses && arg.className?.trim()) {
        return arg.className.trim();
      }

      return getTypeString(arg.type, language) || arg.type;
    };

    const currentArgCount = argumentScheme.length;

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
              const newLanguage = e.target.value as CodeLanguage;
              const normalizedScheme = normalizeArgumentSchemeForLanguage(argumentScheme, newLanguage);
              const normalizedReturn = normalizeReturnSchemaForLanguage(
                returnType,
                returnSchema,
                newLanguage
              );
              updateBlock(slideIndex, block.id, {
                language: newLanguage,
                argumentScheme: normalizedScheme,
                returnType: normalizedReturn.returnType,
                returnSchema: normalizedReturn.returnSchema,
                startCode: buildStarterCode(
                  newLanguage,
                  normalizedScheme,
                  normalizedReturn.returnType,
                  normalizedReturn.returnSchema
                ),
              });
            }}
          >
            {LANGUAGES.map((languageOption) => (
              <option key={languageOption.value} value={languageOption.value}>
                {languageOption.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.form__wrapper}>
          <span>Имя функции для проверки:</span>
          <input
            className={styles.form__input}
            value={block.functionName ?? ""}
            onChange={(e) => updateFunctionName(e.target.value)}
            placeholder={displayedFunctionName}
          />
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
          Если поле пустое, для старых задач будет использована первая найденная функция. Чтобы
          можно было писать вспомогательные функции выше, укажите целевое имя явно.
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
            <div className={styles.form__wrapper}>
              <span>Тип возвращаемого значения:</span>
              <select
                value={returnType}
                onChange={(e) => {
                  const newReturnType = e.target.value as ArgumentType;
                  const nextReturnSchema = { ...(returnSchema ?? {}) };

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
                    nextReturnSchema.arrayElementType = languageConfig.defaultCollectionElementType;
                  }

                  if (
                    (newReturnType === "array" || newReturnType === "list") &&
                    nextReturnSchema.arrayElementType === "object" &&
                    !nextReturnSchema.arrayElementObjectFields
                  ) {
                    nextReturnSchema.arrayElementObjectFields = [createDefaultObjectField(0)];
                  }

                  const normalizedNextReturn = normalizeReturnSchemaForLanguage(
                    newReturnType,
                    nextReturnSchema,
                    language
                  );
                  const nextTestCases = syncTestCasesWithReturnSchema(
                    block.testCases,
                    normalizedNextReturn.returnType,
                    normalizedNextReturn.returnSchema
                  );

                  updateBlock(slideIndex, block.id, {
                    testCases: nextTestCases,
                    returnType: normalizedNextReturn.returnType,
                    returnSchema: normalizedNextReturn.returnSchema,
                    startCode: buildStarterCode(
                      language,
                      argumentScheme,
                      normalizedNextReturn.returnType,
                      normalizedNextReturn.returnSchema
                    ),
                  });
                }}
              >
                {returnTypes.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {typeOption.label}
                  </option>
                ))}
              </select>
            </div>

            {returnType === "object" && (
              <div className={styles.objectFields}>
                {supportsConcreteObjectClasses ? (
                  <>
                    <div className={styles.objectFieldsHeader}>
                      <span>Режим возвращаемого объекта:</span>
                      <select
                        value={getReturnObjectMode()}
                        onChange={(e) =>
                          updateReturnSchema({
                            ...(returnSchema ?? {}),
                            objectReturnMode: e.target.value as ReturnObjectMode,
                            objectFields: returnSchema?.objectFields ?? [createDefaultObjectField(0)],
                          })
                        }
                        className={styles.objectFieldType}
                        style={{ marginLeft: "8px" }}
                      >
                        <option value="generic">Object/object, можно вернуть любой объект</option>
                        <option value="concrete">Конкретный класс</option>
                      </select>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                      {getReturnObjectMode() === "generic"
                        ? "Сигнатура останется общей. Поля ниже нужны для схемы результата и сравнения по значениям."
                        : "Сигнатура метода будет использовать класс ниже, и тесты ожидают экземпляр этого класса."}
                    </div>
                    <div className={styles.objectFieldsHeader} style={{ marginTop: "8px" }}>
                      <span>
                        {getReturnObjectMode() === "generic"
                          ? "Имя класса схемы результата (необязательно):"
                          : "Класс возвращаемого объекта:"}
                      </span>
                      <input
                        value={returnSchema?.className ?? ""}
                        onChange={(e) =>
                          updateReturnSchema({
                            ...(returnSchema ?? {}),
                            className: e.target.value,
                            objectFields: returnSchema?.objectFields ?? [createDefaultObjectField(0)],
                          })
                        }
                        placeholder={getReturnObjectMode() === "generic" ? "Result" : "Person"}
                        style={{ marginLeft: "8px", width: "120px" }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                    Для этого языка объект трактуется как словарь / map / обычный объект. Поля
                    ниже используются для схемы результата и проверки значений.
                  </div>
                )}
                <div className={styles.objectFieldsHeader} style={{ marginTop: "8px" }}>
                  <span>
                    {supportsConcreteObjectClasses && getReturnObjectMode() === "generic"
                      ? "Поля ожидаемого объекта:"
                      : "Поля возвращаемого объекта:"}
                  </span>
                  <Button
                    color="#6a0f6e"
                    width="auto"
                    textColor="#fff"
                    text="+ Добавить поле"
                    onClick={addReturnObjectField}
                  />
                </div>
                {(returnSchema?.objectFields ?? []).map((field, fieldIndex) => (
                  <div key={fieldIndex} className={styles.objectFieldRow}>
                    <input
                      value={field.name}
                      onChange={(e) => {
                        const nextReturnSchema = { ...(returnSchema ?? {}) };
                        const fields = [...(nextReturnSchema.objectFields ?? [])];
                        if (fields[fieldIndex]) {
                          fields[fieldIndex] = { ...fields[fieldIndex], name: e.target.value };
                          nextReturnSchema.objectFields = fields;
                          updateReturnSchema(nextReturnSchema);
                        }
                      }}
                      placeholder="Имя поля"
                      style={{ marginRight: "8px", width: "100px" }}
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateReturnObjectFieldType(fieldIndex, e.target.value as ArgumentType)
                      }
                      className={styles.objectFieldType}
                    >
                      {objectFieldTypes.map((typeOption) => (
                        <option key={typeOption.value} value={typeOption.value}>
                          {typeOption.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteReturnObjectField(fieldIndex)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(returnType === "array" || returnType === "list") && (
              <div className={styles.objectFields}>
                <div className={styles.objectFieldsHeader}>
                  <span>
                    Тип элементов возвращаемого {returnType === "list" ? "списка" : "массива"}:
                  </span>
                  <select
                    value={returnSchema?.arrayElementType ?? languageConfig.defaultCollectionElementType}
                    onChange={(e) => updateReturnArrayElementType(e.target.value as ArgumentType)}
                    className={styles.objectFieldType}
                    style={{ marginLeft: "8px" }}
                  >
                    {collectionElementTypes.map((typeOption) => (
                      <option key={typeOption.value} value={typeOption.value}>
                        {typeOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                {returnSchema?.arrayElementType === "object" && (
                  <div className={styles.arrayElementFields}>
                    {supportsConcreteObjectClasses && (
                      <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                        <span>Класс элемента результата:</span>
                        <input
                          value={returnSchema?.arrayElementClassName ?? ""}
                          onChange={(e) =>
                            updateReturnSchema({
                              ...(returnSchema ?? {}),
                              arrayElementType: "object",
                              arrayElementClassName: e.target.value,
                              arrayElementObjectFields: returnSchema?.arrayElementObjectFields ?? [
                                createDefaultObjectField(0),
                              ],
                            })
                          }
                          placeholder="Person"
                          style={{ marginLeft: "8px", width: "120px" }}
                        />
                      </div>
                    )}
                    <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                      <span>Поля элемента результата:</span>
                      <Button
                        color="#6a0f6e"
                        width="auto"
                        textColor="#fff"
                        text="+ Добавить поле"
                        onClick={addReturnArrayElementObjectField}
                      />
                    </div>
                    {(returnSchema?.arrayElementObjectFields ?? []).map(
                      (field, fieldIndex) => (
                        <div
                          key={fieldIndex}
                          className={styles.objectFieldRow}
                          style={{ marginTop: "4px" }}
                        >
                          <input
                            value={field.name}
                            onChange={(e) =>
                              updateReturnArrayElementObjectField(
                                fieldIndex,
                                e.target.value,
                                field.type
                              )
                            }
                            placeholder="Имя поля"
                            className={styles.objectFieldName}
                            style={{ marginRight: "4px" }}
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateReturnArrayElementObjectField(
                                fieldIndex,
                                field.name,
                                e.target.value as ArgumentType
                              )
                            }
                            className={styles.objectFieldType}
                          >
                            {objectFieldTypes.map((typeOption) => (
                              <option key={typeOption.value} value={typeOption.value}>
                                {typeOption.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className={styles.deleteButton}
                            onClick={() => deleteReturnArrayElementObjectField(fieldIndex)}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
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
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              {argumentScheme.map((arg, argIndex) => (
                <div key={argIndex} className={styles.argumentRow}>
                  <div className={styles.argumentHeader}>
                    <span>Аргумент #{argIndex + 1}</span>
                  </div>
                  <div className={styles.argumentContent}>
                    <input
                      value={arg.name}
                      onChange={(e) => updateArgSchemeName(argIndex, e.target.value)}
                      placeholder="Имя переменной"
                      className={styles.argumentName}
                    />
                    <select
                      value={arg.type}
                      onChange={(e) =>
                        updateArgSchemeType(argIndex, e.target.value as ArgumentType)
                      }
                      className={styles.argumentType}
                    >
                      {argumentTypes.map((typeOption) => (
                        <option key={typeOption.value} value={typeOption.value}>
                          {typeOption.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {arg.type === "object" && (
                    <div className={styles.objectFields}>
                      {supportsConcreteObjectClasses && (
                        <div className={styles.objectFieldsHeader}>
                          <span>Имя класса:</span>
                          <input
                            value={arg.className ?? ""}
                            onChange={(e) => {
                              const scheme = [...argumentScheme];
                              if (scheme[argIndex]) {
                                scheme[argIndex].className = e.target.value;
                                updateBlock(slideIndex, block.id, {
                                  argumentScheme: scheme,
                                  startCode: buildStarterCode(
                                    language,
                                    scheme,
                                    returnType,
                                    returnSchema
                                  ),
                                });
                              }
                            }}
                            placeholder="Person"
                            style={{ marginLeft: "8px", width: "120px" }}
                          />
                        </div>
                      )}
                      <div className={styles.objectFieldsHeader} style={{ marginTop: "8px" }}>
                        <span>Поля объекта:</span>
                        <Button
                          color="#6a0f6e"
                          width="auto"
                          textColor="#fff"
                          text="+ Добавить поле"
                          onClick={() => addObjectFieldToScheme(argIndex)}
                        />
                      </div>
                      {(arg.objectFields ?? []).map((field, fieldIndex) => (
                        <div key={fieldIndex} className={styles.objectFieldRow}>
                          <input
                            value={field.name}
                            onChange={(e) => {
                              const scheme = [...argumentScheme];
                              if (scheme[argIndex]?.objectFields?.[fieldIndex]) {
                                scheme[argIndex].objectFields![fieldIndex].name = e.target.value;
                                updateBlock(slideIndex, block.id, {
                                  argumentScheme: scheme,
                                  startCode: buildStarterCode(
                                    language,
                                    scheme,
                                    returnType,
                                    returnSchema
                                  ),
                                });
                              }
                            }}
                            placeholder="Имя поля"
                            style={{ marginRight: "8px", width: "100px" }}
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateObjectFieldType(
                                argIndex,
                                fieldIndex,
                                e.target.value as ArgumentType
                              )
                            }
                            className={styles.objectFieldType}
                          >
                            {objectFieldTypes.map((typeOption) => (
                              <option key={typeOption.value} value={typeOption.value}>
                                {typeOption.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className={styles.deleteButton}
                            onClick={() => deleteObjectFieldFromScheme(argIndex, fieldIndex)}
                          >
                            ✕
                          </button>
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
                          onChange={(e) =>
                            updateArrayElementType(argIndex, e.target.value as ArgumentType)
                          }
                          className={styles.objectFieldType}
                          style={{ marginLeft: "8px" }}
                        >
                          {collectionElementTypes.map((typeOption) => (
                            <option key={typeOption.value} value={typeOption.value}>
                              {typeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {arg.arrayElementType === "object" && (
                        <div className={styles.arrayElementFields}>
                          {supportsConcreteObjectClasses && (
                            <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                              <span>Имя класса элемента:</span>
                              <input
                                value={arg.arrayElementClassName ?? ""}
                                onChange={(e) => {
                                  const scheme = [...argumentScheme];
                                  if (scheme[argIndex]) {
                                    scheme[argIndex].arrayElementClassName = e.target.value;
                                    updateBlock(slideIndex, block.id, {
                                      argumentScheme: scheme,
                                      startCode: buildStarterCode(
                                        language,
                                        scheme,
                                        returnType,
                                        returnSchema
                                      ),
                                    });
                                  }
                                }}
                                placeholder="Person"
                                style={{ marginLeft: "8px", width: "120px" }}
                              />
                            </div>
                          )}
                          <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                            <span>Поля элемента объекта:</span>
                            <Button
                              color="#6a0f6e"
                              width="auto"
                              textColor="#fff"
                              text="+ Добавить поле"
                              onClick={() => addArrayElementObjectField(argIndex)}
                            />
                          </div>
                          {(arg.arrayElementObjectFields ?? []).map((field, fieldIndex) => (
                            <div
                              key={fieldIndex}
                              className={styles.objectFieldRow}
                              style={{ marginTop: "4px" }}
                            >
                              <input
                                value={field.name}
                                onChange={(e) =>
                                  updateArrayElementObjectField(
                                    argIndex,
                                    fieldIndex,
                                    e.target.value,
                                    field.type
                                  )
                                }
                                placeholder="Имя поля"
                                className={styles.objectFieldName}
                                style={{ marginRight: "4px" }}
                              />
                              <select
                                value={field.type}
                                onChange={(e) =>
                                  updateArrayElementObjectField(
                                    argIndex,
                                    fieldIndex,
                                    field.name,
                                    e.target.value as ArgumentType
                                  )
                                }
                                className={styles.objectFieldType}
                              >
                                {objectFieldTypes.map((typeOption) => (
                                  <option key={typeOption.value} value={typeOption.value}>
                                    {typeOption.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                className={styles.deleteButton}
                                onClick={() => {
                                  const scheme = [...argumentScheme];
                                  if (scheme[argIndex]?.arrayElementObjectFields) {
                                    scheme[argIndex].arrayElementObjectFields!.splice(
                                      fieldIndex,
                                      1
                                    );
                                    updateBlock(slideIndex, block.id, {
                                      argumentScheme: scheme,
                                      startCode: buildStarterCode(
                                        language,
                                        scheme,
                                        returnType,
                                        returnSchema
                                      ),
                                    });
                                  }
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
              ))}
            </div>

            <label>
              Стартовый код
              {(language === "csharp" || language === "java") && (
                <span style={{ fontSize: "0.9em", color: "#666", marginLeft: "10px" }}>
                  (Для {language === "csharp" ? "C#" : "Java"} код автоматически оборачивается в
                  main метод при выполнении)
                </span>
              )}
            </label>
            <StableCodeEditor
              key={`${block.id}_startcode`}
              value={stripMainMethod(block.startCode ?? "", language)}
              onChange={(value) => updateBlock(slideIndex, block.id, { startCode: value })}
              language={language}
              height={220}
            />

            <div className={styles.section}>
              <div className={styles.sectionHeader} style={{marginBottom: "10px"}}>
                <h4>Тест-кейсы</h4>
                <Button
                  color="#9F0FA7"
                width="300px"
                  textColor="#fff"
                  text="+ Добавить тест-кейс"
                  onClick={addTestCase}
                />
              </div>
              {(block.testCases ?? []).map((testCase, testCaseIndex) => (
                <div key={testCaseIndex} className={styles.testCase}>
                  <div className={styles.testCaseHeader}>
                    <span className={styles.testCaseTitle}>Тест #{testCaseIndex + 1}</span>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteTestCase(testCaseIndex)}
                    >
                      ✕
                    </button>
                  </div>

                  {hasArgumentScheme ? (
                    <div className={styles.testCaseArgs}>
                      <span style={{ fontWeight: "bold", marginBottom: "8px", display: "block" }}>
                        Значения аргументов:
                      </span>
                      {argumentScheme.map((arg, argIndex) => (
                        <div key={argIndex} className={styles.testCaseArgRow}>
                          <span style={{ minWidth: "80px" }}>
                            {arg.name} ({getTypeStringForArg(arg)}):
                          </span>

                          {arg.type === "object" && arg.objectFields ? (
                            <div className={styles.testCaseObjectFields}>
                              {arg.objectFields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className={styles.testCaseObjectFieldRow}>
                                  <span style={{ marginRight: "4px" }}>{field.name}:</span>
                                  <input
                                    value={
                                      testCase.args?.[argIndex]?.objectValues?.[field.name] ?? ""
                                    }
                                    onChange={(e) =>
                                      updateTestCaseArgObjectValue(
                                        testCaseIndex,
                                        argIndex,
                                        field.name,
                                        e.target.value
                                      )
                                    }
                                    placeholder={`значение ${field.type}`}
                                    className={styles.objectFieldValue}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <input
                              value={testCase.args?.[argIndex]?.value ?? ""}
                              onChange={(e) =>
                                updateTestCaseArgValue(testCaseIndex, argIndex, e.target.value)
                              }
                              placeholder={
                                arg.type === "object"
                                  ? "{key: value}"
                                  : getTypeStringForArg(arg)
                              }
                              className={styles.argumentValue}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.simpleArgsInput}>
                      <span style={{ fontWeight: "bold", marginBottom: "4px", display: "block" }}>
                        Входные данные:
                      </span>
                      <input
                        value={testCase.input ?? ""}
                        onChange={(e) => updateTestCaseInput(testCaseIndex, e.target.value)}
                        placeholder="1, 'test', [1,2,3], true"
                      />
                    </div>
                  )}

                  {returnType === "object" && returnSchema?.objectFields ? (
                    <div className={styles.testCaseArgs}>
                      <span style={{ fontWeight: "bold", marginBottom: "8px", display: "block" }}>
                        Ожидаемый объект:
                      </span>
                      {returnSchema.objectFields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className={styles.testCaseObjectFieldRow}>
                          <span style={{ marginRight: "4px" }}>{field.name}:</span>
                          <input
                            value={testCase.expectedObjectValues?.[field.name] ?? ""}
                            onChange={(e) =>
                              updateTestCaseExpectedObjectValue(
                                testCaseIndex,
                                field.name,
                                e.target.value
                              )
                            }
                            placeholder={`значение ${field.type}`}
                            className={styles.objectFieldValue}
                          />
                        </div>
                      ))}
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                        JSON результата:{" "}
                        {getExpectedOutputFromTestCase(testCase, returnType, returnSchema) ||
                          "не заполнен"}
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCaseExpected(testCaseIndex, e.target.value)}
                        placeholder={getReturnOutputExample()}
                      />
                      {(returnType === "array" || returnType === "list") && (
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                            Ожидаемый результат задаётся в JSON. Можно указывать только те поля,
                            которые нужно проверить.
                          </div>
                        )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader} style={{marginBottom: "10px"}}>
                <h4>Ограничения</h4>
                <Button
                  color="#9f0fa7"
                   width="300px"
                  textColor="#fff"
                  text="+ Добавить ограничение"
                  onClick={addConstraint}
                />
              </div>
              {(block.constraints ?? []).map((constraint, constraintIndex) => (
                <div key={constraintIndex} className={styles.constraint}>
                  <div className={styles.constraintHeader}>
                    <span className={styles.constraintTitle}>
                      {constraint.type === "maxTimeMs" && " Ограничение по времени"}
                      {constraint.type === "maxLines" && " Ограничение по строкам"}
                      {constraint.type === "forbiddenTokens" && " Запрещённые слова"}
                      {constraint.type === "noComments" && " Без комментариев"}
                      {constraint.type === "noConsoleLog" && " Без console.log"}
                      {constraint.type === "maxComplexity" && " Цикломатическая сложность"}
                      {constraint.type === "memoryLimit" && " Ограничение по памяти"}
                      {constraint.type === "requiredKeywords" && " Обязательные ключевые слова"}
                    </span>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteConstraint(constraintIndex)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.constraintContent}>
                    <select
                      value={constraint.type}
                      onChange={(e) => {
                        const newType = e.target.value as CodeConstraintType;
                        let defaultValue: number | string[] | boolean = 1000;
                        if (newType === "maxLines") defaultValue = 30;
                        if (newType === "forbiddenTokens") defaultValue = [];
                        if (newType === "noComments") defaultValue = true;
                        if (newType === "noConsoleLog") defaultValue = true;
                        if (newType === "maxComplexity") defaultValue = 5;
                        if (newType === "memoryLimit") defaultValue = 256;
                        if (newType === "requiredKeywords") defaultValue = [];
                        updateConstraint(constraintIndex, newType, defaultValue);
                      }}
                    >
                      <option value="maxTimeMs">Время выполнения (мс)</option>
                      <option value="maxLines">Максимум строк кода</option>
                      <option value="forbiddenTokens">Запрещённые слова</option>
                      <option value="noComments"> Без комментариев</option>
                      <option value="noConsoleLog">Без console.log</option>
                      <option value="maxComplexity">Макс. цикломатическая сложность</option>
                      <option value="memoryLimit"> Ограничение по памяти (МБ)</option>
                      <option value="requiredKeywords"> Обязательные ключевые слова</option>
                    </select>

                    {constraint.type === "maxTimeMs" && (
                      <input
                        type="number"
                        value={typeof constraint.value === "number" ? constraint.value : 1000}
                        onChange={(e) =>
                          updateConstraint(constraintIndex, "maxTimeMs", Number(e.target.value))
                        }
                        min="1"
                        max="10000"
                      />
                    )}

                    {constraint.type === "maxLines" && (
                      <input
                        type="number"
                        value={typeof constraint.value === "number" ? constraint.value : 30}
                        onChange={(e) =>
                          updateConstraint(constraintIndex, "maxLines", Number(e.target.value))
                        }
                        min="1"
                        max="500"
                      />
                    )}

                    {constraint.type === "forbiddenTokens" && (
                      <input
                        value={
                          Array.isArray(constraint.value)
                            ? (constraint.value as string[]).join(", ")
                            : ""
                        }
                        onChange={(e) =>
                          updateConstraint(
                            constraintIndex,
                            "forbiddenTokens",
                            e.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="for, while, sort, reverse"
                      />
                    )}

                    {constraint.type === "noComments" && (
                      <div className={styles.checkboxWrapper}>
                        <label style={{display: "flex", columnGap: "10px"}}>
                          <input
                            type="checkbox"
                            checked={constraint.value === true}
                            onChange={(e) =>
                              updateConstraint(constraintIndex, "noComments", e.target.checked)
                            }
                          />
                          <p>

                          Запретить комментарии
                          </p>
                        </label>
                      </div>
                    )}

                    {constraint.type === "noConsoleLog" && (
                      <div className={styles.checkboxWrapper}>
                        <label>
                          <input
                            type="checkbox"
                            checked={constraint.value === true}
                            onChange={(e) =>
                              updateConstraint(constraintIndex, "noConsoleLog", e.target.checked)
                            }
                          />
                          Запретить console.log
                        </label>
                      </div>
                    )}

                    {constraint.type === "maxComplexity" && (
                      <input
                        type="number"
                        value={typeof constraint.value === "number" ? constraint.value : 5}
                        onChange={(e) =>
                          updateConstraint(constraintIndex, "maxComplexity", Number(e.target.value))
                        }
                        min="1"
                        max="20"
                      />
                    )}

                    {constraint.type === "memoryLimit" && (
                      <input
                        type="number"
                        value={typeof constraint.value === "number" ? constraint.value : 256}
                        onChange={(e) =>
                          updateConstraint(constraintIndex, "memoryLimit", Number(e.target.value))
                        }
                        min="16"
                        max="1024"
                      />
                    )}

                    {constraint.type === "requiredKeywords" && (
                      <input
                        value={
                          Array.isArray(constraint.value)
                            ? (constraint.value as string[]).join(", ")
                            : ""
                        }
                        onChange={(e) =>
                          updateConstraint(
                            constraintIndex,
                            "requiredKeywords",
                            e.target.value
                              .split(",")
                              .map((item) => item.trim())
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

  if (block.type === "fillCodeTask") {
    const normalizedBlock = normalizeFillTaskBlock(block);
    const slotIds = extractFillTaskInputs(normalizedBlock.templateCode ?? "");
    const syncedTestCases = syncFillTaskTestCases(
      normalizedBlock.testCases,
      slotIds,
      normalizedBlock.options
    );

    const updateTemplateCode = (templateCode: string) => {
      const nextSlotIds = extractFillTaskInputs(templateCode);

      updateBlock(slideIndex, block.id, {
        templateCode,
        testCases: syncFillTaskTestCases(
          normalizedBlock.testCases,
          nextSlotIds,
          normalizedBlock.options
        ),
      });
    };

    const addTestCase = () => {
      updateBlock(slideIndex, block.id, {
        testCases: [...syncedTestCases, createEmptyFillTaskCase(createFillTaskCaseId(), slotIds)],
      });
    };

    const deleteTestCase = (testCaseIndex: number) => {
      const nextTestCases = [...syncedTestCases];
      nextTestCases.splice(testCaseIndex, 1);

      updateBlock(slideIndex, block.id, {
        testCases: nextTestCases,
      });
    };

    const addOption = () => {
      const nextOptions = [...normalizedBlock.options, { id: createFillTaskOptionId(), value: "" }];

      updateBlock(slideIndex, block.id, {
        options: nextOptions,
        testCases: syncFillTaskTestCases(normalizedBlock.testCases, slotIds, nextOptions),
      });
    };

    const updateOptionValue = (optionId: string, value: string) => {
      const nextOptions = normalizedBlock.options.map((option) =>
        option.id === optionId ? { ...option, value } : option
      );

      updateBlock(slideIndex, block.id, {
        options: nextOptions,
        testCases: syncFillTaskTestCases(normalizedBlock.testCases, slotIds, nextOptions),
      });
    };

    const deleteOption = (optionId: string) => {
      const nextOptions = normalizedBlock.options.filter((option) => option.id !== optionId);

      updateBlock(slideIndex, block.id, {
        options: nextOptions,
        testCases: syncFillTaskTestCases(normalizedBlock.testCases, slotIds, nextOptions),
      });
    };

    const updateTestCaseValue = (testCaseIndex: number, slotId: string, optionId: string) => {
      const nextTestCases = syncedTestCases.map((testCase, currentIndex) => {
        if (currentIndex !== testCaseIndex) {
          return testCase;
        }

        return {
          ...testCase,
          values: testCase.values.map((testValue) =>
            testValue.slotId === slotId ? { ...testValue, optionId: optionId || null } : testValue
          ),
        };
      });

      updateBlock(slideIndex, block.id, {
        testCases: nextTestCases,
      });
    };

    return (
      <div className={styles.blockEditor}>
        <label>Описание задачи</label>
        <textarea
          className={styles.form__textarea}
          value={block.description ?? ""}
          onChange={(e) => updateBlock(slideIndex, block.id, { description: e.target.value })}
          placeholder="Например: допишите пропуски так, чтобы функция возвращала n"
          rows={3}
        />

        <div className={styles.form__wrapper}>
          <span>Язык программирования:</span>
          <select
            value={block.language}
            onChange={(e) =>
              updateBlock(slideIndex, block.id, { language: e.target.value as FillCodeLanguage })
            }
          >
            {FILL_TASK_LANGUAGES.map((languageOption) => (
              <option key={languageOption.value} value={languageOption.value}>
                {languageOption.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fillTaskHint}>
          Это задача типа "дописать код": пользователь не редактирует шаблон, а только заполняет
          белые поля внутри него. Отмечайте слоты через <code>[[slot-name]]</code> или legacy-формат{" "}
          <code>[input1]</code>, <code>[input2]</code>.
        </div>

        <label>Шаблон кода</label>
        <StableCodeEditor
          key={`${block.id}_fill_template`}
          value={normalizedBlock.templateCode}
          onChange={updateTemplateCode}
          language={block.language}
          height={220}
        />

        <div className={styles.fillTaskInfo}>
          <span>
            Слоты в коде:{" "}
            {slotIds.length > 0
              ? slotIds.map((slotId) => `[[${slotId}]]`).join(", ")
              : "не найдены"}
          </span>
          <span>
            Пользователь сможет только переносить варианты в белые поля внутри кода. Решение
            засчитывается, если оно совпало хотя бы с одной комбинацией ниже.
          </span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Варианты для перетаскивания</h4>
            <Button
              color="#9F0FA7"
              width="auto"
              textColor="#fff"
              text="+ Добавить вариант"
              onClick={addOption}
            />
          </div>

          {normalizedBlock.options.length === 0 && (
            <p className={styles.fillTaskWarning}>
              Добавьте хотя бы один вариант ответа, который пользователь сможет перетаскивать.
            </p>
          )}

          <div className={styles.fillTaskOptionList}>
            {normalizedBlock.options.map((option, optionIndex) => (
              <div key={option.id} className={styles.fillTaskOptionRow}>
                <span className={styles.fillTaskOptionBadge}>#{optionIndex + 1}</span>
                <input
                  className={styles.form__input}
                  value={option.value}
                  onChange={(e) => updateOptionValue(option.id, e.target.value)}
                  placeholder="Например: a, b, +, var, return"
                />
                <button className={styles.deleteButton} onClick={() => deleteOption(option.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Допустимые решения</h4>
            <Button
              color="#9F0FA7"
              width="auto"
              textColor="#fff"
              text="+ Добавить вариант"
              onClick={addTestCase}
              disabled={slotIds.length === 0}
            />
          </div>

          {slotIds.length === 0 && (
            <p className={styles.fillTaskWarning}>
              Добавьте в код хотя бы один слот вида <code>[[slot-name]]</code>, чтобы настроить
              проверку.
            </p>
          )}

          {slotIds.length > 0 && normalizedBlock.options.length === 0 && (
            <p className={styles.fillTaskWarning}>
              Сначала задайте варианты ответа, затем настройте допустимые комбинации по слотам.
            </p>
          )}

          {slotIds.length > 0 && syncedTestCases.length === 0 && (
            <p className={styles.fillTaskWarning}>
              Добавьте хотя бы один допустимый вариант заполнения слотов. Можно задать несколько
              комбинаций, и пользователю будет достаточно совпасть с любой из них.
            </p>
          )}

          {syncedTestCases.map((testCase, testCaseIndex) => (
            <div key={testCase.id} className={styles.fillTaskCase}>
              <div className={styles.optionHeader}>
                <span className={styles.optionTitle}>Комбинация {testCaseIndex + 1}</span>
                <button
                  className={styles.deleteButton}
                  onClick={() => deleteTestCase(testCaseIndex)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.fillTaskCaseInputs}>
                {slotIds.map((slotId) => (
                  <label key={slotId} className={styles.fillTaskCaseInput}>
                    <span className={styles.fillTaskCaseLabel}>[[{slotId}]]</span>
                    <select
                      className={styles.form__input}
                      value={getFillTaskCaseOptionId(testCase, slotId) ?? ""}
                      onChange={(e) => updateTestCaseValue(testCaseIndex, slotId, e.target.value)}
                    >
                      <option value="">Выберите вариант</option>
                      {normalizedBlock.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.value || "(пустое значение)"}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "theoryQuestion") {
    const addOption = () => updateBlock(slideIndex, block.id, { options: [...block.options, ""] });

    const setOption = (index: number, value: string) => {
      const options = [...block.options];
      options[index] = value;
      updateBlock(slideIndex, block.id, { options });
    };

    const deleteOption = (index: number) => {
      const options = [...block.options];
      options.splice(index, 1);
      if (block.correctIndex === index) {
        updateBlock(slideIndex, block.id, { options, correctIndex: 0 });
      } else if (block.correctIndex > index) {
        updateBlock(slideIndex, block.id, {
          options,
          correctIndex: block.correctIndex - 1,
        });
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
          onChange={(value) => updateBlock(slideIndex, block.id, { code: value })}
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
            <div style={{display: "flex", width: "100%", justifyContent: "center"}}>

            <Button
              color="#9F0FA7"
              width="300px"
              textColor="#fff"
              text="+ Добавить вариант"
              onClick={addOption}
              />
              </div>
          </div>
          {block.options.map((option, optionIndex) => (
            <div key={optionIndex} className={styles.option} >
              <div className={styles.optionHeader}>
                <span className={styles.optionTitle}>Вариант {optionIndex + 1}</span>
                <button className={styles.deleteButton} onClick={() => deleteOption(optionIndex)}   style={{marginLeft: "10px"}}>
                  ✕
                </button>
              </div>
              <div className={styles.optionContent}>
                <input
                  value={option}
                  onChange={(e) => setOption(optionIndex, e.target.value)}
                  placeholder={`Вариант ${optionIndex + 1}`}
                  className={styles.form__input}
                />
                <label className={styles.radioLabel} style={{display: "flex", columnGap: "10px"}}>
                  <input
                    type="radio"
                    name={`correct_${block.id}`}
                    checked={block.correctIndex === optionIndex}
                    onChange={() =>
                      updateBlock(slideIndex, block.id, { correctIndex: optionIndex })
                    }
                  />
                  <p>
                    
                  Правильный ответ
                  </p>
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
