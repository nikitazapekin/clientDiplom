export const CODEX_TYPED_FLAG = "__codexTyped" as const;

export interface CodexTypedEnvelope {
  [CODEX_TYPED_FLAG]: true;
  type: string;
  value: unknown;
  className?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value)
);

export const isCodexTypedEnvelope = (value: unknown): value is CodexTypedEnvelope => (
  isPlainObject(value) &&
  value[CODEX_TYPED_FLAG] === true &&
  typeof value.type === "string" &&
  "value" in value
);

export const normalizeSchemaType = (type: string): string => {
  if (type === "array_int") return "array";

  if (type === "array_string") return "array";

  if (type === "array_double") return "array";

  if (type === "array_float") return "array";

  if (type === "array_long") return "array";

  if (type === "array_boolean") return "array";

  if (type === "array_char") return "array";

  if (type === "number") return "double";

  return type;
};

export const normalizeRuntimeType = (type: string): string => {
  const lowered = type.toLowerCase();

  if (lowered === "str") return "string";

  if (lowered === "bool") return "boolean";

  if (lowered === "integer" || lowered === "int32" || lowered === "int64") return "int";

  if (lowered === "single") return "float";

  if (lowered === "decimal") return "double";

  return lowered;
};

const isNumericSchemaType = (type: string): boolean =>
  ["int", "byte", "short", "long", "float", "double", "number"].includes(type);

export const runtimeTypeMatchesSchema = (
  runtimeType: string,
  schemaType: string,
  returnSchema?: { className?: string },
  runtimeClassName?: string,
): boolean => {
  const runtime = normalizeRuntimeType(runtimeType);
  const schema = normalizeSchemaType(schemaType);

  if (isNumericSchemaType(runtime) && isNumericSchemaType(schema)) {
    return true;
  }

  if (runtime === schema) {
    if (schema === "object" && returnSchema?.className && runtimeClassName) {
      return runtimeClassName === returnSchema.className;
    }

    return true;
  }

  if (
    (schema === "array" || schema === "list") &&
    (runtime === "array" || runtime === "list")
  ) {
    return true;
  }

  return false;
};

export const unwrapCodexValue = (value: unknown): unknown => {
  if (!isCodexTypedEnvelope(value)) {
    return value;
  }

  const { type } = value;

  if (type === "null") {
    return null;
  }

  if (type === "array" || type === "list") {
    if (!Array.isArray(value.value)) {
      return value.value;
    }

    return value.value.map((item) => unwrapCodexValue(item));
  }

  if (type === "map" || type === "object") {
    if (!isPlainObject(value.value)) {
      return value.value;
    }

    const unwrapped: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value.value)) {
      unwrapped[key] = unwrapCodexValue(nested);
    }

    return unwrapped;
  }

  return value.value;
};

export const getCodexRuntimeType = (value: unknown): string | undefined => {
  if (!isCodexTypedEnvelope(value)) {
    return undefined;
  }

  return value.type;
};

export const getCodexClassName = (value: unknown): string | undefined => {
  if (!isCodexTypedEnvelope(value)) {
    return undefined;
  }

  return typeof value.className === "string" ? value.className : undefined;
};

export const formatComparableOutputForDisplay = (value: unknown): string => {
  let normalized: unknown = value;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    try {
      normalized = JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  const unwrapped = unwrapCodexValue(normalized);

  if (unwrapped == null) {
    return "null";
  }

  if (typeof unwrapped === "string") {
    return unwrapped;
  }

  if (typeof unwrapped === "number" || typeof unwrapped === "boolean") {
    return String(unwrapped);
  }

  return JSON.stringify(unwrapped);
};

export const validateCodexRuntimeType = (
  actual: unknown,
  returnType?: string,
  returnSchema?: { className?: string },
): boolean => {
  if (!returnType) {
    return true;
  }

  if (!isCodexTypedEnvelope(actual)) {
    return true;
  }

  return runtimeTypeMatchesSchema(
    actual.type,
    returnType,
    returnSchema,
    getCodexClassName(actual),
  );
};
