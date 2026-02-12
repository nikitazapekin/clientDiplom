export type SlideType = "lesson" | "test";

export type CodeLanguage = "javascript" | "python" | "csharp" | "golang" | "java";

export interface BaseBlock {
  id: string;
  order: number;
}

// --- Lesson blocks ---
export interface TextBlock extends BaseBlock {
  type: "text";
  content: string;
}

export interface CodeExampleBlock extends BaseBlock {
  type: "codeExample";
  code: string;
  language: CodeLanguage;
  runnable: boolean;
}

export interface SourceBlock extends BaseBlock {
  type: "source";
  url: string;
  note?: string;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  rows: number;
  cols: number;
  cells: string[][];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
}

export type LessonBlock = TextBlock | CodeExampleBlock | SourceBlock | TableBlock | ImageBlock;

// --- Test blocks ---
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

export interface CodeTaskBlock extends BaseBlock {
  type: "codeTask";
  description?: string;
  language?: CodeLanguage;
  runnable: boolean;
  startCode?: string;
  expectedOutput?: string;
  testCases?: { input: string; expectedOutput: string }[];
  constraints?: CodeConstraint[];
}

export interface TheoryQuestionBlock extends BaseBlock {
  type: "theoryQuestion";
  text?: string;
  code?: string;
  imageUrl?: string;
  options: string[];
  correctIndex: number;
}

export type TestBlock = TextBlock | CodeTaskBlock | TheoryQuestionBlock;

export type SlideBlock = LessonBlock | TestBlock;

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  order: number;
  blocks: SlideBlock[];
}

export interface LessonContentData {
  slides: Slide[];
}
