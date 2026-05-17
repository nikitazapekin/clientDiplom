import { getDefaultStarterCode } from "./codeUtils";
import { createEmptyFillTaskCase, extractFillTaskInputs } from "./fillTaskUtils";
import { getDefaultReturnTypeForLanguage } from "./schemaBuilderConfig";
import type {
  CodeExampleBlock,
  CodeTaskBlock,
  FillCodeTaskBlock,
  ImageBlock,
  SourceBlock,
  TableBlock,
  TextBlock,
  TheoryQuestionBlock,
} from "./types";

export const genId = () =>
  `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${performance.now()}`;

export const createTextBlock = (order: number): TextBlock => ({
  id: genId(),
  order,
  type: "text",
  content: "",
});

export const createCodeExampleBlock = (order: number): CodeExampleBlock => ({
  id: genId(),
  order,
  type: "codeExample",
  code: "",
  language: "javascript",
  runnable: false,
});

export const createSourceBlock = (order: number): SourceBlock => ({
  id: genId(),
  order,
  type: "source",
  url: "",
  note: "",
});

export const createTableBlock = (order: number, rows = 2, cols = 2): TableBlock => ({
  id: genId(),
  order,
  type: "table",
  rows,
  cols,
  cells: Array(rows)
    .fill(null)
    .map(() => Array(cols).fill("")),
});

export const createImageBlock = (order: number): ImageBlock => ({
  id: genId(),
  order,
  type: "image",
  url: "",
  file: null,
});

export const createCodeTaskBlock = (order: number): CodeTaskBlock => ({
  id: genId(),
  order,
  type: "codeTask",
  runnable: true,
  functionName: "",
  language: "javascript",
  startCode: getDefaultStarterCode("javascript"),
  testCases: [],
  constraints: [],
  argumentScheme: [],
  returnType: getDefaultReturnTypeForLanguage("javascript"),
});

export const createFillCodeTaskBlock = (order: number): FillCodeTaskBlock => {
  const templateCode = `// Заполните метод sum так, чтобы он возвращал сумму аргументов a и b\nconst obj = {\n  sum: function(a, b) { return [input1] + [input2]; }\n};\n\nobj.sum(1, 2);`;
  const inputIds = extractFillTaskInputs(templateCode);
  const options = [
    { id: genId(), value: "a" },
    { id: genId(), value: "b" },
  ];

  return {
    id: genId(),
    order,
    type: "fillCodeTask",
    description:
      "Дописать код: пользователь не может менять шаблон, он только заполняет белые поля внутри кода. Ниже настройте допустимые комбинации ответов.",
    language: "javascript",
    templateCode,
    options,
    testCases: [
      {
        ...createEmptyFillTaskCase(genId(), inputIds),
        values: [
          { slotId: "input1", optionId: options[0].id },
          { slotId: "input2", optionId: options[1].id },
        ],
      },
      {
        ...createEmptyFillTaskCase(genId(), inputIds),
        values: [
          { slotId: "input1", optionId: options[1].id },
          { slotId: "input2", optionId: options[0].id },
        ],
      },
    ],
  };
};

export const createTheoryQuestionBlock = (order: number): TheoryQuestionBlock => ({
  id: genId(),
  order,
  type: "theoryQuestion",
  options: ["", ""],
  correctIndex: 0,
});
