import {
  getCodexClassName,
  isCodexTypedEnvelope,
  unwrapCodexValue,
  validateCodexRuntimeType,
} from "./typedResultFormat";

export type ScalarArgumentType =
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
  | "void";

export type ArgumentType =
  | ScalarArgumentType
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
  | "map";

export interface TypedObjectField {
  name: string;
  type: ArgumentType | string;
}

export interface ReturnSchema {
  className?: string;
  arrayElementType?: ArgumentType | string;
  arrayElementClassName?: string;
  objectFields?: TypedObjectField[];
  arrayElementObjectFields?: TypedObjectField[];
  objectReturnMode?: "generic" | "concrete";
}

export interface CompareOutputsOptions {
  returnType?: ArgumentType | string;
  returnSchema?: ReturnSchema;
}

const FLOAT_EPSILON = 1e-9;

const LEGACY_ARRAY_ELEMENT_TYPES: Record<string, ArgumentType | string> = {
  array_int: "int",
  array_string: "string",
  array_double: "double",
  array_float: "float",
  array_long: "long",
  array_boolean: "boolean",
  array_char: "char",
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value)
);

const isIntegralType = (type: string): boolean => (
  ["int", "byte", "short", "long"].includes(type)
);

const isFloatingType = (type: string): boolean => (
  ["float", "double", "number"].includes(type)
);

export const resolveCollectionElementType = (
  returnType?: string,
  returnSchema?: ReturnSchema,
): string | undefined => {
  if (!returnType) {
    return undefined;
  }

  if (returnType in LEGACY_ARRAY_ELEMENT_TYPES) {
    return LEGACY_ARRAY_ELEMENT_TYPES[returnType];
  }

  if (returnType === "array" || returnType === "list") {
    return returnSchema?.arrayElementType;
  }

  return undefined;
};

const isCollectionReturnType = (returnType?: string): boolean => (
  Boolean(
    returnType &&
    (returnType === "array" ||
      returnType === "list" ||
      returnType in LEGACY_ARRAY_ELEMENT_TYPES),
  )
);

export const coerceValueByType = (
  value: unknown,
  type: string,
  schema?: ReturnSchema,
): unknown => {
  if (value == null) {
    return value;
  }

  const legacyElementType = LEGACY_ARRAY_ELEMENT_TYPES[type];

  if (legacyElementType) {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((item) => coerceValueByType(item, legacyElementType));
  }

  if (type === "array" || type === "list") {
    const elementType = schema?.arrayElementType ?? "int";

    if (!Array.isArray(value)) {
      return value;
    }

    const elementSchema: ReturnSchema | undefined =
      elementType === "object"
        ? { objectFields: schema?.arrayElementObjectFields }
        : undefined;

    return value.map((item) => coerceValueByType(item, elementType, elementSchema));
  }

  switch (type) {
    case "object": {
      if (!isPlainObject(value)) {
        return value;
      }

      const fields = schema?.objectFields ?? [];

      if (fields.length === 0) {
        return value;
      }

      const result: Record<string, unknown> = {};

      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(value, field.name)) {
          result[field.name] = coerceValueByType(value[field.name], field.type);
        }
      }

      return result;
    }

    case "map": {
      if (!isPlainObject(value)) {
        return value;
      }

      const result: Record<string, unknown> = {};

      for (const [key, mapValue] of Object.entries(value)) {
        result[String(key)] = mapValue;
      }

      return result;
    }

    case "boolean": {
      if (typeof value === "boolean") {
        return value;
      }

      if (typeof value === "string") {
        return value.trim().toLowerCase() === "true";
      }

      return Boolean(value);
    }

    case "string":
      return String(value);

    case "char": {
      const asString = String(value);

      return asString.length > 0 ? asString[0] : asString;
    }

    default:
      if (type === "int" || type === "byte" || type === "short" || type === "long") {
        const numericValue = Number(value);

        return Number.isFinite(numericValue) ? Math.trunc(numericValue) : value;
      }

      if (type === "float" || type === "double" || type === "number") {
        const numericValue = Number(value);

        return Number.isFinite(numericValue) ? numericValue : value;
      }

      return value;
  }
};

const compareScalarValues = (actual: unknown, expected: unknown, type: string): boolean => {
  const coercedActual = coerceValueByType(actual, type);
  const coercedExpected = coerceValueByType(expected, type);

  if (coercedActual == null && coercedExpected == null) {
    return true;
  }

  if (coercedActual == null || coercedExpected == null) {
    return false;
  }

  if (isFloatingType(type)) {
    const actualNumber = Number(coercedActual);
    const expectedNumber = Number(coercedExpected);

    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
      return String(coercedActual).trim() === String(coercedExpected).trim();
    }

    return Math.abs(actualNumber - expectedNumber) <= FLOAT_EPSILON;
  }

  if (isIntegralType(type)) {
    const actualNumber = Number(coercedActual);
    const expectedNumber = Number(coercedExpected);

    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
      return String(coercedActual).trim() === String(coercedExpected).trim();
    }

    return (
      Math.trunc(actualNumber) === actualNumber &&
      Math.trunc(expectedNumber) === expectedNumber &&
      actualNumber === expectedNumber
    );
  }

  if (type === "boolean") {
    return coercedActual === coercedExpected;
  }

  if (type === "char") {
    return String(coercedActual) === String(coercedExpected);
  }

  return String(coercedActual).trim() === String(coercedExpected).trim();
};

const compareNormalizedOutputs = (actual: unknown, expected: unknown): boolean => {
  if (actual == null && expected == null) {
    return true;
  }

  if (actual == null || expected == null) {
    return false;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return false;
    }

    return expected.every((item, index) => compareNormalizedOutputs(actual[index], item));
  }

  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) {
      return false;
    }

    return Object.entries(expected).every(([key, value]) => (
      compareNormalizedOutputs(actual[key], value)
    ));
  }

  if (Array.isArray(actual) || isPlainObject(actual)) {
    return false;
  }

  return String(actual).trim() === String(expected).trim();
};

export const compareOutputsWithType = (
  actual: unknown,
  expected: unknown,
  returnType?: string,
  returnSchema?: ReturnSchema,
): boolean => {
  if (returnType && isCodexTypedEnvelope(actual)) {
    if (!validateCodexRuntimeType(actual, returnType, returnSchema)) {
      return false;
    }
  }

  const actualForCompare = unwrapCodexValue(actual);
  const expectedForCompare = unwrapCodexValue(expected);

  if (!returnType) {
    return compareNormalizedOutputs(actualForCompare, expectedForCompare);
  }

  if (isCollectionReturnType(returnType)) {
    const elementType = resolveCollectionElementType(returnType, returnSchema) ?? "int";
    const collectionType = returnType in LEGACY_ARRAY_ELEMENT_TYPES ? returnType : "array";
    const coercedActual = coerceValueByType(actualForCompare, collectionType, returnSchema);
    const coercedExpected = coerceValueByType(expectedForCompare, collectionType, returnSchema);

    if (!Array.isArray(coercedActual) || !Array.isArray(coercedExpected)) {
      return compareNormalizedOutputs(coercedActual, coercedExpected);
    }

    if (coercedActual.length !== coercedExpected.length) {
      return false;
    }

    const actualItemsRaw = isCodexTypedEnvelope(actual) && Array.isArray(actual.value)
      ? actual.value
      : actual;

    return coercedActual.every((item, index) => {
      const actualItem = Array.isArray(actualItemsRaw) ? actualItemsRaw[index] : item;

      if (isCodexTypedEnvelope(actualItem) && !validateCodexRuntimeType(actualItem, elementType)) {
        return false;
      }

      if (elementType === "object") {
        return compareOutputsWithType(
          item,
          coercedExpected[index],
          "object",
          { objectFields: returnSchema?.arrayElementObjectFields },
        );
      }

      return compareScalarValues(item, coercedExpected[index], elementType);
    });
  }

  if (returnType === "object") {
    if (
      isCodexTypedEnvelope(actual) &&
      returnSchema?.className &&
      getCodexClassName(actual) &&
      getCodexClassName(actual) !== returnSchema.className
    ) {
      return false;
    }

    const coercedActual = coerceValueByType(actualForCompare, "object", returnSchema);
    const coercedExpected = coerceValueByType(expectedForCompare, "object", returnSchema);

    if (!isPlainObject(coercedActual) || !isPlainObject(coercedExpected)) {
      return compareNormalizedOutputs(coercedActual, coercedExpected);
    }

    const fields = returnSchema?.objectFields ?? [];

    if (fields.length > 0) {
      return fields.every((field) => (
        compareOutputsWithType(
          coercedActual[field.name],
          coercedExpected[field.name],
          field.type,
        )
      ));
    }

    return compareNormalizedOutputs(coercedActual, coercedExpected);
  }

  if (returnType === "map") {
    const coercedActual = coerceValueByType(actualForCompare, "map");
    const coercedExpected = coerceValueByType(expectedForCompare, "map");

    if (!isPlainObject(coercedActual) || !isPlainObject(coercedExpected)) {
      return compareNormalizedOutputs(coercedActual, coercedExpected);
    }

    const actualKeys = Object.keys(coercedActual).sort();
    const expectedKeys = Object.keys(coercedExpected).sort();

    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }

    return actualKeys.every((key, index) => (
      key === expectedKeys[index] &&
      compareNormalizedOutputs(coercedActual[key], coercedExpected[key])
    ));
  }

  return compareScalarValues(actualForCompare, expectedForCompare, returnType);
};

const parseStructuredFieldValue = (rawValue: string, type: string): unknown => {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === "null") {
    return null;
  }

  if (type === "string" || type === "char") {
    return rawValue;
  }

  if (type === "boolean") {
    return trimmedValue.toLowerCase() === "true";
  }

  if (
    type === "int" ||
    type === "double" ||
    type === "float" ||
    type === "long" ||
    type === "short" ||
    type === "byte" ||
    type === "number"
  ) {
    return Number(trimmedValue);
  }

  return rawValue;
};

export const buildExpectedObjectOutput = (
  expectedObjectValues: Record<string, string> | undefined,
  returnSchema?: ReturnSchema,
): string => {
  if (!returnSchema?.objectFields || returnSchema.objectFields.length === 0) {
    return "";
  }

  const values = expectedObjectValues ?? {};
  const output: Record<string, unknown> = {};

  returnSchema.objectFields.forEach((field) => {
    const rawValue = values[field.name] ?? "";

    if (rawValue.trim() === "") {
      return;
    }

    output[field.name] = parseStructuredFieldValue(rawValue, field.type);
  });

  return Object.keys(output).length > 0 ? JSON.stringify(output) : "";
};

export const getExpectedOutputFromTestCase = (
  testCase: {
    expectedOutput?: unknown;
    expectedObjectValues?: Record<string, string>;
  },
  returnType?: string,
  returnSchema?: ReturnSchema,
): string => {
  if (returnType === "object" && returnSchema?.objectFields) {
    const built = buildExpectedObjectOutput(testCase.expectedObjectValues, returnSchema);

    if (built) {
      return built;
    }
  }

  if (testCase.expectedOutput === undefined || testCase.expectedOutput === null) {
    return "";
  }

  return typeof testCase.expectedOutput === "string"
    ? testCase.expectedOutput
    : JSON.stringify(testCase.expectedOutput);
};
