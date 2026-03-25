import { getDefaultStarterCode } from "./codeUtils";
import { createEmptyFillTaskCase, extractFillTaskInputs } from "./fillTaskUtils";
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
  language: "javascript",
  startCode: getDefaultStarterCode("javascript"),
  testCases: [],
  constraints: [],
  argumentScheme: [],
  returnType: "int",
});

export const createFillCodeTaskBlock = (order: number): FillCodeTaskBlock => {
  const templateCode = `const result = [[leftValue]] [[operator]] [[rightValue]];\nconsole.log(result);`;
  const inputIds = extractFillTaskInputs(templateCode);
  const options = [
    { id: genId(), value: "a" },
    { id: genId(), value: "b" },
    { id: genId(), value: "+" },
    { id: genId(), value: "-" },
  ];

  return {
    id: genId(),
    order,
    type: "fillCodeTask",
    description:
      "Соберите код из готовых вариантов. Помечайте места вставки как [[slot-name]] и задавайте допустимые комбинации ниже.",
    language: "javascript",
    templateCode,
    options,
    testCases: [
      {
        ...createEmptyFillTaskCase(genId(), inputIds),
        values: [
          { slotId: "leftValue", optionId: options[0].id },
          { slotId: "operator", optionId: options[2].id },
          { slotId: "rightValue", optionId: options[1].id },
        ],
      },
      {
        ...createEmptyFillTaskCase(genId(), inputIds),
        values: [
          { slotId: "leftValue", optionId: options[1].id },
          { slotId: "operator", optionId: options[2].id },
          { slotId: "rightValue", optionId: options[0].id },
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
