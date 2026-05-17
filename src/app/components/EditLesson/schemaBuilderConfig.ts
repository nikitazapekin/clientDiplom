import type { ArgumentSchema, ArgumentType, ObjectField, ReturnSchema } from "./types";

import type { CodeLanguage } from "@/app/http/codeService";

export interface TypeOption {
  value: ArgumentType;
  label: string;
}

interface LanguageSchemaConfig {
  defaultArgumentType: ArgumentType;
  defaultReturnType: ArgumentType;
  defaultCollectionElementType: ArgumentType;
  argumentTypes: TypeOption[];
  returnTypes: TypeOption[];
  objectFieldTypes: TypeOption[];
  collectionElementTypes: TypeOption[];
  supportsConcreteObjectClasses: boolean;
  supportsListType: boolean;
}

const makeOptions = (entries: Array<[ArgumentType, string]>): TypeOption[] =>
  entries.map(([value, label]) => ({ value, label }));

const LANGUAGE_SCHEMA_CONFIGS: Record<CodeLanguage, LanguageSchemaConfig> = {
  javascript: {
    defaultArgumentType: "string",
    defaultReturnType: "number",
    defaultCollectionElementType: "number",
    argumentTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["object", "object"],
      ["array", "array"],
    ]),
    returnTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["object", "object"],
      ["array", "array"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
  typescript: {
    defaultArgumentType: "string",
    defaultReturnType: "number",
    defaultCollectionElementType: "number",
    argumentTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["object", "object"],
      ["array", "array"],
    ]),
    returnTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["object", "object"],
      ["array", "array"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: true,
    supportsListType: false,
  },
  python: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "int"],
      ["float", "float"],
      ["string", "str"],
      ["boolean", "bool"],
      ["object", "dict/object"],
      ["array", "list"],
    ]),
    returnTypes: makeOptions([
      ["int", "int"],
      ["float", "float"],
      ["string", "str"],
      ["boolean", "bool"],
      ["object", "dict/object"],
      ["array", "list"],
      ["void", "None"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "str"],
      ["int", "int"],
      ["float", "float"],
      ["boolean", "bool"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "str"],
      ["int", "int"],
      ["float", "float"],
      ["boolean", "bool"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
  php: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "int"],
      ["float", "float"],
      ["string", "string"],
      ["boolean", "bool"],
      ["object", "object/assoc array"],
      ["array", "array"],
    ]),
    returnTypes: makeOptions([
      ["int", "int"],
      ["float", "float"],
      ["string", "string"],
      ["boolean", "bool"],
      ["object", "object/assoc array"],
      ["array", "array"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["float", "float"],
      ["boolean", "bool"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["float", "float"],
      ["boolean", "bool"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
  ruby: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "Integer"],
      ["float", "Float"],
      ["string", "String"],
      ["boolean", "boolean"],
      ["object", "Hash/object"],
      ["array", "Array"],
    ]),
    returnTypes: makeOptions([
      ["int", "Integer"],
      ["float", "Float"],
      ["string", "String"],
      ["boolean", "boolean"],
      ["object", "Hash/object"],
      ["array", "Array"],
      ["void", "nil"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "String"],
      ["int", "Integer"],
      ["float", "Float"],
      ["boolean", "boolean"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "String"],
      ["int", "Integer"],
      ["float", "Float"],
      ["boolean", "boolean"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
  rust: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "i32"],
      ["long", "i64"],
      ["float", "f32"],
      ["double", "f64"],
      ["string", "String"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "HashMap"],
      ["array", "Vec"],
    ]),
    returnTypes: makeOptions([
      ["int", "i32"],
      ["long", "i64"],
      ["float", "f32"],
      ["double", "f64"],
      ["string", "String"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "HashMap"],
      ["array", "Vec"],
      ["void", "()"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "String"],
      ["int", "i32"],
      ["long", "i64"],
      ["float", "f32"],
      ["double", "f64"],
      ["boolean", "bool"],
      ["char", "char"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "String"],
      ["int", "i32"],
      ["long", "i64"],
      ["float", "f32"],
      ["double", "f64"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
  csharp: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["string", "string"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object"],
      ["array", "array"],
      ["list", "List"],
    ]),
    returnTypes: makeOptions([
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["string", "string"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object"],
      ["array", "array"],
      ["list", "List"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["boolean", "bool"],
      ["char", "char"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: true,
    supportsListType: true,
  },
  java: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["string", "String"],
      ["boolean", "boolean"],
      ["char", "char"],
      ["object", "Object"],
      ["array", "array"],
      ["list", "List"],
    ]),
    returnTypes: makeOptions([
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["string", "String"],
      ["boolean", "boolean"],
      ["char", "char"],
      ["object", "Object"],
      ["array", "array"],
      ["list", "List"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "String"],
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["boolean", "boolean"],
      ["char", "char"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "String"],
      ["int", "int"],
      ["short", "short"],
      ["byte", "byte"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["boolean", "boolean"],
      ["char", "char"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: true,
    supportsListType: true,
  },
  golang: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "int"],
      ["short", "int16"],
      ["byte", "byte"],
      ["long", "int64"],
      ["float", "float32"],
      ["double", "float64"],
      ["string", "string"],
      ["boolean", "bool"],
      ["char", "rune"],
      ["object", "map/object"],
      ["array", "slice"],
    ]),
    returnTypes: makeOptions([
      ["int", "int"],
      ["short", "int16"],
      ["byte", "byte"],
      ["long", "int64"],
      ["float", "float32"],
      ["double", "float64"],
      ["string", "string"],
      ["boolean", "bool"],
      ["char", "rune"],
      ["object", "map/object"],
      ["array", "slice"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["short", "int16"],
      ["byte", "byte"],
      ["long", "int64"],
      ["float", "float32"],
      ["double", "float64"],
      ["boolean", "bool"],
      ["char", "rune"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["short", "int16"],
      ["byte", "byte"],
      ["long", "int64"],
      ["float", "float32"],
      ["double", "float64"],
      ["boolean", "bool"],
      ["char", "rune"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
  cpp: {
    defaultArgumentType: "int",
    defaultReturnType: "int",
    defaultCollectionElementType: "int",
    argumentTypes: makeOptions([
      ["int", "int"],
      ["short", "short"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["string", "string"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object/map"],
      ["array", "vector"],
    ]),
    returnTypes: makeOptions([
      ["int", "int"],
      ["short", "short"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["string", "string"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object/map"],
      ["array", "vector"],
      ["void", "void"],
    ]),
    objectFieldTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["short", "short"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["boolean", "bool"],
      ["char", "char"],
    ]),
    collectionElementTypes: makeOptions([
      ["string", "string"],
      ["int", "int"],
      ["short", "short"],
      ["long", "long"],
      ["float", "float"],
      ["double", "double"],
      ["boolean", "bool"],
      ["char", "char"],
      ["object", "object"],
    ]),
    supportsConcreteObjectClasses: false,
    supportsListType: false,
  },
};

const LEGACY_ARRAY_ELEMENT_TYPES: Partial<Record<ArgumentType, ArgumentType>> = {
  array_int: "int",
  array_string: "string",
  array_double: "double",
  array_float: "float",
  array_long: "long",
  array_boolean: "boolean",
  array_char: "char",
};

const TYPE_ALIASES_BY_LANGUAGE: Record<CodeLanguage, Partial<Record<ArgumentType, ArgumentType>>> = {
  javascript: {
    int: "number",
    long: "number",
    short: "number",
    byte: "number",
    float: "number",
    double: "number",
    char: "string",
    list: "array",
    map: "object",
  },
  typescript: {
    int: "number",
    long: "number",
    short: "number",
    byte: "number",
    float: "number",
    double: "number",
    char: "string",
    list: "array",
    map: "object",
  },
  python: {
    number: "float",
    long: "int",
    short: "int",
    byte: "int",
    char: "string",
    list: "array",
    map: "object",
  },
  php: {
    number: "float",
    double: "float",
    long: "int",
    short: "int",
    byte: "int",
    char: "string",
    list: "array",
    map: "object",
  },
  ruby: {
    number: "float",
    double: "float",
    long: "int",
    short: "int",
    byte: "int",
    char: "string",
    list: "array",
    map: "object",
  },
  rust: {
    number: "double",
    short: "int",
    byte: "int",
    list: "array",
    map: "object",
  },
  csharp: {
    number: "double",
    map: "object",
  },
  java: {
    number: "double",
    map: "object",
  },
  golang: {
    number: "double",
    list: "array",
    map: "object",
  },
  cpp: {
    number: "double",
    byte: "short",
    list: "array",
    map: "object",
  },
};

const normalizeFieldCollection = (
  fields: ObjectField[] | undefined,
  language: CodeLanguage
): ObjectField[] | undefined => {
  if (!fields) {
    return fields;
  }

  return fields.map((field, index) => ({
    ...field,
    name: field.name || `field${index + 1}`,
    type: normalizeTypeForLanguage(field.type, language, "objectField"),
  }));
};

type TypeContext = "argument" | "return" | "objectField" | "collectionElement";

const getSupportedValues = (language: CodeLanguage, context: TypeContext): Set<ArgumentType> => {
  const config = LANGUAGE_SCHEMA_CONFIGS[language];

  switch (context) {
    case "argument":
      return new Set(config.argumentTypes.map((option) => option.value));

    case "return":
      return new Set(config.returnTypes.map((option) => option.value));

    case "objectField":
      return new Set(config.objectFieldTypes.map((option) => option.value));

    case "collectionElement":
      return new Set(config.collectionElementTypes.map((option) => option.value));
  }
};

export const getLanguageSchemaConfig = (language: CodeLanguage): LanguageSchemaConfig =>
  LANGUAGE_SCHEMA_CONFIGS[language];

export const getDefaultArgumentTypeForLanguage = (language: CodeLanguage): ArgumentType =>
  LANGUAGE_SCHEMA_CONFIGS[language].defaultArgumentType;

export const getDefaultReturnTypeForLanguage = (language: CodeLanguage): ArgumentType =>
  LANGUAGE_SCHEMA_CONFIGS[language].defaultReturnType;

export const normalizeTypeForLanguage = (
  type_: ArgumentType,
  language: CodeLanguage,
  context: TypeContext
): ArgumentType => {
  const config = LANGUAGE_SCHEMA_CONFIGS[language];
  const supportedValues = getSupportedValues(language, context);

  if (supportedValues.has(type_)) {
    return type_;
  }

  const aliasedType = TYPE_ALIASES_BY_LANGUAGE[language][type_] ?? type_;

  if (supportedValues.has(aliasedType)) {
    return aliasedType;
  }

  if (LEGACY_ARRAY_ELEMENT_TYPES[type_]) {
    return config.supportsListType && context !== "objectField" ? "array" : "array";
  }

  if (context === "collectionElement") {
    return config.defaultCollectionElementType;
  }

  if (context === "objectField") {
    return config.objectFieldTypes[0]?.value ?? "string";
  }

  if (context === "return") {
    return config.defaultReturnType;
  }

  return config.defaultArgumentType;
};

export const normalizeArgumentSchemeForLanguage = (
  argumentScheme: ArgumentSchema[],
  language: CodeLanguage
): ArgumentSchema[] => {
  const config = getLanguageSchemaConfig(language);

  return argumentScheme.map((argument, index) => {
    const arrayElementTypeFromLegacy = LEGACY_ARRAY_ELEMENT_TYPES[argument.type];
    const normalizedType = arrayElementTypeFromLegacy
      ? "array"
      : normalizeTypeForLanguage(argument.type, language, "argument");
    const normalizedArrayType =
      normalizedType === "list" && !config.supportsListType ? "array" : normalizedType;

    const nextArgument: ArgumentSchema = {
      ...argument,
      name: argument.name || `arg${index + 1}`,
      type: normalizedArrayType,
    };

    if (normalizedArrayType === "object") {
      nextArgument.objectFields = normalizeFieldCollection(argument.objectFields, language);
    } else {
      nextArgument.objectFields = undefined;
      nextArgument.className = undefined;
    }

    if (normalizedArrayType === "array" || normalizedArrayType === "list") {
      const rawArrayElementType = arrayElementTypeFromLegacy ?? argument.arrayElementType ?? "int";
      const normalizedElementType = normalizeTypeForLanguage(
        rawArrayElementType,
        language,
        "collectionElement"
      );

      nextArgument.arrayElementType = normalizedElementType;

      if (normalizedElementType === "object") {
        nextArgument.arrayElementObjectFields = normalizeFieldCollection(
          argument.arrayElementObjectFields,
          language
        );
      } else {
        nextArgument.arrayElementObjectFields = undefined;
        nextArgument.arrayElementClassName = undefined;
      }
    } else {
      nextArgument.arrayElementType = undefined;
      nextArgument.arrayElementClassName = undefined;
      nextArgument.arrayElementObjectFields = undefined;
    }

    return nextArgument;
  });
};

export const normalizeReturnSchemaForLanguage = (
  returnType: ArgumentType | undefined,
  returnSchema: ReturnSchema | undefined,
  language: CodeLanguage
): { returnType: ArgumentType; returnSchema: ReturnSchema | undefined } => {
  const config = getLanguageSchemaConfig(language);
  const arrayElementTypeFromLegacy = returnType ? LEGACY_ARRAY_ELEMENT_TYPES[returnType] : undefined;
  const normalizedType = normalizeTypeForLanguage(
    arrayElementTypeFromLegacy ? "array" : returnType ?? config.defaultReturnType,
    language,
    "return"
  );
  const normalizedReturnType =
    normalizedType === "list" && !config.supportsListType ? "array" : normalizedType;

  const nextReturnSchema: ReturnSchema = { ...(returnSchema ?? {}) };

  if (normalizedReturnType === "object") {
    nextReturnSchema.objectFields = normalizeFieldCollection(nextReturnSchema.objectFields, language);

    if (!config.supportsConcreteObjectClasses) {
      nextReturnSchema.objectReturnMode = "generic";
    }
  } else {
    nextReturnSchema.objectFields = undefined;
    nextReturnSchema.objectReturnMode = config.supportsConcreteObjectClasses
      ? nextReturnSchema.objectReturnMode
      : undefined;
  }

  if (normalizedReturnType === "array" || normalizedReturnType === "list") {
    const normalizedElementType = normalizeTypeForLanguage(
      arrayElementTypeFromLegacy ?? nextReturnSchema.arrayElementType ?? config.defaultCollectionElementType,
      language,
      "collectionElement"
    );

    nextReturnSchema.arrayElementType = normalizedElementType;

    if (normalizedElementType === "object") {
      nextReturnSchema.arrayElementObjectFields = normalizeFieldCollection(
        nextReturnSchema.arrayElementObjectFields,
        language
      );
    } else {
      nextReturnSchema.arrayElementObjectFields = undefined;
      nextReturnSchema.arrayElementClassName = undefined;
    }
  } else {
    nextReturnSchema.arrayElementType = undefined;
    nextReturnSchema.arrayElementClassName = undefined;
    nextReturnSchema.arrayElementObjectFields = undefined;
  }

  if (!config.supportsConcreteObjectClasses) {
    nextReturnSchema.className = undefined;
    nextReturnSchema.arrayElementClassName = undefined;
  }

  const hasReturnSchemaData = Object.values(nextReturnSchema).some((value) => value !== undefined);

  return {
    returnType: normalizedReturnType,
    returnSchema: hasReturnSchemaData ? nextReturnSchema : undefined,
  };
};
