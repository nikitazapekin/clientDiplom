// app/components/EditLesson/types.ts
export type SlideType = "lesson" | "test";

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  order: number; // ВНИМАНИЕ: используется order, не orderIndex
  blocks: SlideBlock[];
}

export type CodeLanguage = "javascript" | "python" | "csharp" | "java" | "golang";

export interface TextBlock {
  id: string;
  order: number;
  type: "text";
  content: string;
}

export interface CodeExampleBlock {
  id: string;
  order: number;
  type: "codeExample";
  code: string;
  language: CodeLanguage;
  runnable: boolean;
}

export interface SourceBlock {
  id: string;
  order: number;
  type: "source";
  url: string;
  note?: string;
}

export interface TableBlock {
  id: string;
  order: number;
  type: "table";
  rows: number;
  cols: number;
  cells: string[][];
}

export interface ImageBlock {
  id: string;
  order: number;
  type: "image";
  url: string;
}

export type CodeConstraintType =
  | "maxTimeMs"
  | "maxLines"
  | "forbiddenTokens"
  | "noComments"
  | "noConsoleLog"
  | "maxComplexity"
  | "memoryLimit"
  | "requiredKeywords";

export interface CodeConstraint {
  type: CodeConstraintType;
  value: number | string[] | boolean;
}

export interface CodeTaskBlock {
  id: string;
  order: number;
  type: "codeTask";
  description?: string;
  language: CodeLanguage;
  startCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  constraints?: CodeConstraint[];
  runnable: boolean;
  expectedOutput?: string; // для задач на вывод
}

export interface TheoryQuestionBlock {
  id: string;
  order: number;
  type: "theoryQuestion";
  text?: string;
  code?: string;
  imageUrl?: string;
  options: string[];
  correctIndex: number;
}

export type SlideBlock =
  | TextBlock
  | CodeExampleBlock
  | SourceBlock
  | TableBlock
  | ImageBlock
  | CodeTaskBlock
  | TheoryQuestionBlock;
