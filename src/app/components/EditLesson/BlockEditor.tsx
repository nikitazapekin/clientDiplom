/* eslint-disable */

import { useRef, type ChangeEvent } from "react";

import Button from "../Button";

import styles from "./index.module.scss";
import {
  buildExpectedObjectOutput,
  getDefaultStarterCode,
  getEffectiveReturnObjectMode,
  getExpectedOutputFromTestCase,
  getTypeString,
  stripMainMethod,
} from "./codeUtils";
import { LANGUAGES, StableCodeEditor } from "./editorShared";
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
  { value: "python", label: "Python" },
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
    const typedLanguages: CodeLanguage[] = ["java", "csharp", "golang", "cpp"];
    const isTypedLanguage = typedLanguages.includes(block.language);
    const hasArgumentScheme = (block.argumentScheme?.length ?? 0) > 0;
    const buildStarterCode = (
      language: CodeLanguage = block.language ?? "javascript",
      argumentScheme: ArgumentSchema[] = block.argumentScheme ?? [],
      returnType: ArgumentType = block.returnType ?? "int",
      returnSchema: ReturnSchema | undefined = block.returnSchema
    ) => getDefaultStarterCode(language, argumentScheme, returnType, returnSchema);
    const getReturnObjectMode = (
      returnSchema: ReturnSchema | undefined = block.returnSchema
    ): ReturnObjectMode => getEffectiveReturnObjectMode(returnSchema);

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
      const nextTestCases = syncTestCasesWithReturnSchema(
        block.testCases,
        block.returnType ?? "int",
        nextReturnSchema
      );

      updateBlock(slideIndex, block.id, {
        testCases: nextTestCases,
        returnSchema: nextReturnSchema,
        startCode: buildStarterCode(
          block.language ?? "javascript",
          block.argumentScheme ?? [],
          block.returnType ?? "int",
          nextReturnSchema
        ),
      });
    };

    const createDefaultObjectField = (index: number) => ({
      name: `field${index + 1}`,
      type: "string" as ArgumentType,
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
      if (block.returnType === "object" && block.returnSchema?.objectFields) {
        const fields = block.returnSchema.objectFields
          .map((field) => `"${field.name}": ${getValueExampleForType(field.type)}`)
          .join(", ");
        return `{${fields}}`;
      }

      if (block.returnType === "list") {
        const elementType = block.returnSchema?.arrayElementType ?? "object";
        if (elementType === "object" && block.returnSchema?.arrayElementObjectFields) {
          const fields = block.returnSchema.arrayElementObjectFields
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
        expectedOutput: buildExpectedObjectOutput(expectedObjectValues, block.returnSchema),
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
      const scheme = [...(block.argumentScheme ?? [])];
      if (!scheme[index]) {
        scheme[index] = { name: `arg${index + 1}`, type: "int" };
      }
      scheme[index].type = newType;
      if (newType === "object") {
        scheme[index].objectFields = scheme[index].objectFields ?? [
          { name: "field1", type: "string", value: "" },
        ];
      } else {
        delete scheme[index].objectFields;
      }
      updateBlock(slideIndex, block.id, {
        argumentScheme: scheme,
        startCode: buildStarterCode(block.language ?? "javascript", scheme),
      });
    };

    const updateArgSchemeName = (index: number, name: string) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (!scheme[index]) {
        scheme[index] = { name: `arg${index + 1}`, type: "int" };
      }
      scheme[index].name = name;
      updateBlock(slideIndex, block.id, {
        argumentScheme: scheme,
        startCode: buildStarterCode(block.language ?? "javascript", scheme),
      });
    };

    const setArgSchemeCount = (count: number) => {
      const currentScheme = block.argumentScheme ?? [];
      const newScheme = [...currentScheme];
      const defaultType: ArgumentType = isTypedLanguage ? "int" : "string";

      while (newScheme.length < count) {
        newScheme.push({ name: `arg${newScheme.length + 1}`, type: defaultType });
      }
      while (newScheme.length > count) {
        newScheme.pop();
      }

      updateBlock(slideIndex, block.id, {
        argumentScheme: newScheme,
        startCode: buildStarterCode(block.language ?? "javascript", newScheme),
      });
    };

    const updateObjectFieldType = (
      argIndex: number,
      fieldIndex: number,
      fieldType: ArgumentType
    ) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.objectFields?.[fieldIndex]) {
        scheme[argIndex].objectFields![fieldIndex].type = fieldType;
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(block.language ?? "javascript", scheme),
        });
      }
    };

    const addObjectFieldToScheme = (argIndex: number) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]) {
        if (!scheme[argIndex].objectFields) {
          scheme[argIndex].objectFields = [];
        }
        scheme[argIndex].objectFields!.push({
          name: `field${scheme[argIndex].objectFields!.length + 1}`,
          type: "string",
          value: "",
        });
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(block.language ?? "javascript", scheme),
        });
      }
    };

    const deleteObjectFieldFromScheme = (argIndex: number, fieldIndex: number) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.objectFields) {
        scheme[argIndex].objectFields!.splice(fieldIndex, 1);
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(block.language ?? "javascript", scheme),
        });
      }
    };

    const updateArrayElementType = (argIndex: number, elementType: ArgumentType) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]) {
        scheme[argIndex].arrayElementType = elementType;
        if (elementType === "object") {
          scheme[argIndex].arrayElementObjectFields = scheme[argIndex].arrayElementObjectFields ?? [
            { name: "field1", type: "string", value: "" },
          ];
        } else {
          delete scheme[argIndex].arrayElementObjectFields;
        }
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(block.language ?? "javascript", scheme),
        });
      }
    };

    const addArrayElementObjectField = (argIndex: number) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.arrayElementObjectFields) {
        scheme[argIndex].arrayElementObjectFields!.push({
          name: `field${scheme[argIndex].arrayElementObjectFields!.length + 1}`,
          type: "string",
          value: "",
        });
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(block.language ?? "javascript", scheme),
        });
      }
    };

    const updateArrayElementObjectField = (
      argIndex: number,
      fieldIndex: number,
      fieldName: string,
      fieldType: ArgumentType
    ) => {
      const scheme = [...(block.argumentScheme ?? [])];
      if (scheme[argIndex]?.arrayElementObjectFields?.[fieldIndex]) {
        scheme[argIndex].arrayElementObjectFields![fieldIndex].name = fieldName;
        scheme[argIndex].arrayElementObjectFields![fieldIndex].type = fieldType;
        updateBlock(slideIndex, block.id, {
          argumentScheme: scheme,
          startCode: buildStarterCode(block.language ?? "javascript", scheme),
        });
      }
    };

    const updateReturnObjectFieldType = (fieldIndex: number, fieldType: ArgumentType) => {
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.objectFields ?? [])];
      if (fields[fieldIndex]) {
        fields[fieldIndex] = { ...fields[fieldIndex], type: fieldType };
        nextReturnSchema.objectFields = fields;
        updateReturnSchema(nextReturnSchema);
      }
    };

    const addReturnObjectField = () => {
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.objectFields ?? [])];
      fields.push(createDefaultObjectField(fields.length));
      nextReturnSchema.objectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const deleteReturnObjectField = (fieldIndex: number) => {
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.objectFields ?? [])];
      fields.splice(fieldIndex, 1);
      nextReturnSchema.objectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const updateReturnArrayElementType = (elementType: ArgumentType) => {
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
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
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
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
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.arrayElementObjectFields ?? [])];
      if (fields[fieldIndex]) {
        fields[fieldIndex] = { ...fields[fieldIndex], name: fieldName, type: fieldType };
        nextReturnSchema.arrayElementObjectFields = fields;
        updateReturnSchema(nextReturnSchema);
      }
    };

    const deleteReturnArrayElementObjectField = (fieldIndex: number) => {
      const nextReturnSchema = { ...(block.returnSchema ?? {}) };
      const fields = [...(nextReturnSchema.arrayElementObjectFields ?? [])];
      fields.splice(fieldIndex, 1);
      nextReturnSchema.arrayElementObjectFields = fields;
      updateReturnSchema(nextReturnSchema);
    };

    const getTypeStringForLang = (type: ArgumentType): string => {
      return getTypeString(type, block.language ?? "javascript");
    };

    const formatValueForLanguage = (arg: ArgumentSchema, value: string): string => {
      if (!value.trim()) return "";

      const language = block.language ?? "javascript";

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
        const objectValues =
          (block.testCases ?? [])
            .flatMap((testCase) => testCase.args ?? [])
            .find((argument) => argument.index === block.argumentScheme?.indexOf(arg))
            ?.objectValues ?? {};

        const fields = arg.objectFields
          .map((field) => {
            const currentValue = objectValues[field.name] ?? field.value ?? "";
            if (field.type === "string") {
              return `${field.name}: "${currentValue}"`;
            }
            if (field.type === "boolean") {
              return `${field.name}: ${currentValue.toLowerCase() === "true" ? "true" : "false"}`;
            }
            return `${field.name}: ${currentValue}`;
          })
          .join(", ");

        if (language === "java") {
          return `new ${
            arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1)
          }(${fields.replace(/,/g, ", ")})`;
        }
        if (language === "csharp") {
          const csharpFields = arg.objectFields
            .map((field) => {
              const currentValue = objectValues[field.name] ?? field.value ?? "";
              if (field.type === "string") {
                return `${field.name} = "${currentValue}"`;
              }
              if (field.type === "boolean") {
                return `${field.name} = ${
                  currentValue.toLowerCase() === "true" ? "true" : "false"
                }`;
              }
              return `${field.name} = ${currentValue}`;
            })
            .join(", ");
          return `new ${
            arg.className || arg.name.charAt(0).toUpperCase() + arg.name.slice(1)
          } { ${csharpFields} }`;
        }
        return value;
      }
      if (arg.type === "array" || arg.type === "list") {
        return value;
      }

      return value;
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

    const argumentTypes = isTypedLanguage ? typedArgumentTypes : untypedArgumentTypes;
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
              const newLanguage = e.target.value as CodeLanguage;
              updateBlock(slideIndex, block.id, {
                language: newLanguage,
                startCode: buildStarterCode(
                  newLanguage,
                  block.argumentScheme ?? [],
                  block.returnType ?? "int",
                  block.returnSchema
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
                    const nextReturnSchema = { ...(block.returnSchema ?? {}) };

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

                    if (newReturnType === "list" && !nextReturnSchema.arrayElementType) {
                      nextReturnSchema.arrayElementType = "object";
                      nextReturnSchema.arrayElementObjectFields = [createDefaultObjectField(0)];
                    }

                    const nextTestCases = syncTestCasesWithReturnSchema(
                      block.testCases,
                      newReturnType,
                      nextReturnSchema
                    );

                    updateBlock(slideIndex, block.id, {
                      testCases: nextTestCases,
                      returnType: newReturnType,
                      returnSchema: nextReturnSchema,
                      startCode: buildStarterCode(
                        block.language ?? "javascript",
                        block.argumentScheme ?? [],
                        newReturnType,
                        nextReturnSchema
                      ),
                    });
                  }}
                >
                  {returnTypes.map((returnType) => (
                    <option key={returnType.value} value={returnType.value}>
                      {returnType.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isTypedLanguage && block.returnType === "object" && (
              <div className={styles.objectFields}>
                <div className={styles.objectFieldsHeader}>
                  <span>Режим возвращаемого объекта:</span>
                  <select
                    value={getReturnObjectMode()}
                    onChange={(e) =>
                      updateReturnSchema({
                        ...(block.returnSchema ?? {}),
                        objectReturnMode: e.target.value as ReturnObjectMode,
                        objectFields: block.returnSchema?.objectFields ?? [
                          createDefaultObjectField(0),
                        ],
                      })
                    }
                    className={styles.objectFieldType}
                    style={{ marginLeft: "8px" }}
                  >
                    <option value="generic">Object, можно вернуть любой объект</option>
                    <option value="concrete">Конкретный класс, вернуть его экземпляр</option>
                  </select>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                  {getReturnObjectMode() === "generic"
                    ? "Сигнатура метода останется Object/object. Поля ниже нужны для схемы результата и сравнения по значениям."
                    : "Сигнатура метода будет использовать имя класса ниже, и метод должен вернуть экземпляр этого класса."}
                </div>
                <div className={styles.objectFieldsHeader} style={{ marginTop: "8px" }}>
                  <span>
                    {getReturnObjectMode() === "generic"
                      ? "Имя класса схемы результата (необязательно):"
                      : "Класс возвращаемого объекта:"}
                  </span>
                  <input
                    value={block.returnSchema?.className ?? ""}
                    onChange={(e) =>
                      updateReturnSchema({
                        ...(block.returnSchema ?? {}),
                        className: e.target.value,
                        objectFields: block.returnSchema?.objectFields ?? [
                          createDefaultObjectField(0),
                        ],
                      })
                    }
                    placeholder={getReturnObjectMode() === "generic" ? "Test1" : "Person"}
                    style={{ marginLeft: "8px", width: "120px" }}
                  />
                </div>
                <div className={styles.objectFieldsHeader} style={{ marginTop: "8px" }}>
                  <span>
                    {getReturnObjectMode() === "generic"
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
                {(block.returnSchema?.objectFields ?? []).map((field, fieldIndex) => (
                  <div key={fieldIndex} className={styles.objectFieldRow}>
                    <input
                      value={field.name}
                      onChange={(e) => {
                        const nextReturnSchema = { ...(block.returnSchema ?? {}) };
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
                      {primitiveTypes.map((typeOption) => (
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

            {isTypedLanguage && block.returnType === "list" && (
              <div className={styles.objectFields}>
                <div className={styles.objectFieldsHeader}>
                  <span>Тип элементов возвращаемого списка:</span>
                  <select
                    value={block.returnSchema?.arrayElementType ?? "object"}
                    onChange={(e) => updateReturnArrayElementType(e.target.value as ArgumentType)}
                    className={styles.objectFieldType}
                    style={{ marginLeft: "8px" }}
                  >
                    <option value="int">int</option>
                    <option value="string">string</option>
                    <option value="boolean">boolean</option>
                    <option value="double">double</option>
                    <option value="float">float</option>
                    <option value="object">object (свой объект класс)</option>
                  </select>
                </div>

                {block.returnSchema?.arrayElementType === "object" && (
                  <div className={styles.arrayElementFields}>
                    <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                      <span>Класс элемента результата:</span>
                      <input
                        value={block.returnSchema?.arrayElementClassName ?? ""}
                        onChange={(e) =>
                          updateReturnSchema({
                            ...(block.returnSchema ?? {}),
                            arrayElementType: "object",
                            arrayElementClassName: e.target.value,
                            arrayElementObjectFields: block.returnSchema
                              ?.arrayElementObjectFields ?? [createDefaultObjectField(0)],
                          })
                        }
                        placeholder="Person"
                        style={{ marginLeft: "8px", width: "120px" }}
                      />
                    </div>
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
                    {(block.returnSchema?.arrayElementObjectFields ?? []).map(
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
                            {primitiveTypes.map((typeOption) => (
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
              {(block.argumentScheme ?? []).map((arg, argIndex) => (
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

                  {arg.type === "object" && isTypedLanguage && (
                    <div className={styles.objectFields}>
                      <div className={styles.objectFieldsHeader}>
                        <span>Имя класса:</span>
                        <input
                          value={arg.className ?? ""}
                          onChange={(e) => {
                            const scheme = [...(block.argumentScheme ?? [])];
                            if (scheme[argIndex]) {
                              scheme[argIndex].className = e.target.value;
                              updateBlock(slideIndex, block.id, {
                                argumentScheme: scheme,
                                startCode: buildStarterCode(block.language ?? "javascript", scheme),
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
                          onClick={() => addObjectFieldToScheme(argIndex)}
                        />
                      </div>
                      {(arg.objectFields ?? []).map((field, fieldIndex) => (
                        <div key={fieldIndex} className={styles.objectFieldRow}>
                          <input
                            value={field.name}
                            onChange={(e) => {
                              const scheme = [...(block.argumentScheme ?? [])];
                              if (scheme[argIndex]?.objectFields?.[fieldIndex]) {
                                scheme[argIndex].objectFields![fieldIndex].name = e.target.value;
                                updateBlock(slideIndex, block.id, { argumentScheme: scheme });
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
                            {primitiveTypes.map((typeOption) => (
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
                                if (scheme[argIndex]) {
                                  scheme[argIndex].arrayElementClassName = e.target.value;
                                  updateBlock(slideIndex, block.id, {
                                    argumentScheme: scheme,
                                    startCode: buildStarterCode(
                                      block.language ?? "javascript",
                                      scheme
                                    ),
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
                                {primitiveTypes.map((typeOption) => (
                                  <option key={typeOption.value} value={typeOption.value}>
                                    {typeOption.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                className={styles.deleteButton}
                                onClick={() => {
                                  const scheme = [...(block.argumentScheme ?? [])];
                                  if (scheme[argIndex]?.arrayElementObjectFields) {
                                    scheme[argIndex].arrayElementObjectFields!.splice(
                                      fieldIndex,
                                      1
                                    );
                                    updateBlock(slideIndex, block.id, { argumentScheme: scheme });
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
              onChange={(value) => updateBlock(slideIndex, block.id, { startCode: value })}
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
                      {(block.argumentScheme ?? []).map((arg, argIndex) => (
                        <div key={argIndex} className={styles.testCaseArgRow}>
                          <span style={{ minWidth: "80px" }}>
                            {arg.name}
                            {isTypedLanguage && ` (${getTypeStringForLang(arg.type)})`}:
                          </span>

                          {arg.type === "object" && arg.objectFields && isTypedLanguage ? (
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
                                    placeholder={`значение ${isTypedLanguage ? field.type : ""}`}
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
                                  : isTypedLanguage
                                    ? arg.type
                                    : ""
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

                  {isTypedLanguage &&
                  block.returnType === "object" &&
                  block.returnSchema?.objectFields ? (
                    <div className={styles.testCaseArgs}>
                      <span style={{ fontWeight: "bold", marginBottom: "8px", display: "block" }}>
                        Ожидаемый объект:
                      </span>
                      {block.returnSchema.objectFields.map((field, fieldIndex) => (
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
                        {getExpectedOutputFromTestCase(
                          testCase,
                          block.returnType,
                          block.returnSchema
                        ) || "не заполнен"}
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCaseExpected(testCaseIndex, e.target.value)}
                        placeholder={getReturnOutputExample()}
                      />
                      {isTypedLanguage &&
                        (block.returnType === "object" || block.returnType === "list") && (
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
              <div className={styles.sectionHeader}>
                <h4>Ограничения</h4>
                <Button
                  color="#9f0fa7"
                  width="auto"
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
                        <label>
                          <input
                            type="checkbox"
                            checked={constraint.value === true}
                            onChange={(e) =>
                              updateConstraint(constraintIndex, "noComments", e.target.checked)
                            }
                          />
                          Запретить комментарии
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
            <Button
              color="#9F0FA7"
              width="auto"
              textColor="#fff"
              text="+ Добавить вариант"
              onClick={addOption}
            />
          </div>
          {block.options.map((option, optionIndex) => (
            <div key={optionIndex} className={styles.option}>
              <div className={styles.optionHeader}>
                <span className={styles.optionTitle}>Вариант {optionIndex + 1}</span>
                <button className={styles.deleteButton} onClick={() => deleteOption(optionIndex)}>
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
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={`correct_${block.id}`}
                    checked={block.correctIndex === optionIndex}
                    onChange={() =>
                      updateBlock(slideIndex, block.id, { correctIndex: optionIndex })
                    }
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
