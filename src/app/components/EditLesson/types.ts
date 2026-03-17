// app/components/EditLesson/types.ts
export type SlideType = "lesson" | "test";

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  order: number;
  blocks: SlideBlock[];
}

export type CodeLanguage = "javascript" | "python" | "csharp" | "java" | "golang" | "cpp";

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
  file?: File | null; // Добавляем опциональное поле file
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

export type ArgumentType = 
  | "int" 
  | "string" 
  | "boolean" 
  | "double" 
  | "float" 
  | "long" 
  | "char" 
  | "byte" 
  | "short"
  | "object"
  | "array"
  | "list"
  | "map"
  | "void";

export interface ObjectField {
  name: string;
  type: ArgumentType;
  value: string;
}

export interface FunctionArgument {
  name: string;
  type: ArgumentType;
  value: string;
  objectFields?: ObjectField[];
}

export interface ArgumentSchema {
  name: string;
  type: ArgumentType;
  className?: string;  // Custom class name for object types
  arrayElementType?: ArgumentType;
  arrayElementClassName?: string;  // Custom class name for array element objects
  objectFields?: ObjectField[];
  arrayElementObjectFields?: ObjectField[];
}

export interface LanguageSpecificArg {
  index: number;
  name: string;
  type: ArgumentType;
}

export interface ArgumentScheme {
  arguments: ArgumentSchema[];
  defaultLanguage: CodeLanguage;
}

export interface TestCaseArgument {
  index: number;
  value: string;
  objectValues?: Record<string, string>;
}

export interface CodeTaskBlock {
  id: string;
  order: number;
  type: "codeTask";
  description?: string;
  language: CodeLanguage;
  startCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string; args?: TestCaseArgument[] }>;
  constraints?: CodeConstraint[];
  runnable: boolean;
  expectedOutput?: string;
  argumentScheme?: ArgumentSchema[];
  returnType?: ArgumentType;
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
