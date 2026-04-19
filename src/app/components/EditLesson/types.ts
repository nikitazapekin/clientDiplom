export type SlideType = "lesson" | "test";

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  order: number;
  blocks: SlideBlock[];
  isPersisted?: boolean;
}

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "php"
  | "ruby"
  | "rust"
  | "csharp"
  | "java"
  | "golang"
  | "cpp";
export type FillCodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "php"
  | "ruby"
  | "rust"
  | "csharp"
  | "java";

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
  file?: File | null;
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
  | "number"
  | "boolean"
  | "double"
  | "float"
  | "long"
  | "char"
  | "byte"
  | "short"
  | "object"
  | "array"
  | "array_int"
  | "array_string"
  | "array_double"
  | "array_float"
  | "array_long"
  | "array_boolean"
  | "array_char"
  | "list"
  | "map"
  | "void";

export interface ObjectField {
  name: string;
  type: ArgumentType;
  value: string;
}

export interface StructuredTypeSchema {
  className?: string;
  arrayElementType?: ArgumentType;
  arrayElementClassName?: string;
  objectFields?: ObjectField[];
  arrayElementObjectFields?: ObjectField[];
}

export interface FunctionArgument {
  name: string;
  type: ArgumentType;
  value: string;
  objectFields?: ObjectField[];
}

export interface ArgumentSchema extends StructuredTypeSchema {
  name: string;
  type: ArgumentType;
}

export type ReturnObjectMode = "generic" | "concrete";

export interface ReturnSchema extends StructuredTypeSchema {
  objectReturnMode?: ReturnObjectMode;
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

export interface CodeTaskTestCase {
  input: string;
  expectedOutput: string;
  args?: TestCaseArgument[];
  expectedObjectValues?: Record<string, string>;
}

export interface CodeTaskBlock {
  id: string;
  order: number;
  type: "codeTask";
  description?: string;
  language: CodeLanguage;
  startCode?: string;
  testCases?: CodeTaskTestCase[];
  constraints?: CodeConstraint[];
  runnable: boolean;
  expectedOutput?: string;
  argumentScheme?: ArgumentSchema[];
  returnType?: ArgumentType;
  returnSchema?: ReturnSchema;
}

export interface FillCodeTaskCaseValue {
  slotId: string;
  optionId: string | null;
  value?: string;
}

export interface FillCodeTaskOption {
  id: string;
  value: string;
}

export interface FillCodeTaskCase {
  id: string;
  values: FillCodeTaskCaseValue[];
}

export interface FillCodeTaskBlock {
  id: string;
  order: number;
  type: "fillCodeTask";
  description?: string;
  language: FillCodeLanguage;
  templateCode: string;
  options: FillCodeTaskOption[];
  testCases: FillCodeTaskCase[];
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
  | FillCodeTaskBlock
  | TheoryQuestionBlock;
