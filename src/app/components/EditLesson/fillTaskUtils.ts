import type { FillCodeTaskCase } from "./types";

export interface FillTaskValidationResult {
  passed: boolean;
  matchedCaseIndex: number | null;
  totalCases: number;
}

export const FILL_TASK_PLACEHOLDER_REGEX = /\[(input[\w-]*)\]/g;

const normalizeValue = (value: string | undefined): string => (value ?? "").trim();

export const extractFillTaskInputs = (templateCode: string): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const match of templateCode.matchAll(FILL_TASK_PLACEHOLDER_REGEX)) {
    const inputId = match[1];

    if (!seen.has(inputId)) {
      seen.add(inputId);
      result.push(inputId);
    }
  }

  return result;
};

export const createEmptyFillTaskCase = (id: string, inputIds: string[]): FillCodeTaskCase => ({
  id,
  values: inputIds.map((inputId) => ({
    inputId,
    value: "",
  })),
});

export const syncFillTaskTestCases = (
  testCases: FillCodeTaskCase[] | undefined,
  inputIds: string[]
): FillCodeTaskCase[] => {
  return (testCases ?? []).map((testCase) => {
    const valuesMap = new Map(testCase.values.map((value) => [value.inputId, value.value]));

    return {
      ...testCase,
      values: inputIds.map((inputId) => ({
        inputId,
        value: valuesMap.get(inputId) ?? "",
      })),
    };
  });
};

export const getFillTaskCaseValue = (testCase: FillCodeTaskCase, inputId: string): string => {
  return testCase.values.find((value) => value.inputId === inputId)?.value ?? "";
};

export const validateFillTaskAnswers = (
  testCases: FillCodeTaskCase[] | undefined,
  answers: Record<string, string>,
  inputIds: string[]
): FillTaskValidationResult => {
  const normalizedCases = syncFillTaskTestCases(testCases, inputIds);

  if (normalizedCases.length === 0 || inputIds.length === 0) {
    return {
      passed: false,
      matchedCaseIndex: null,
      totalCases: normalizedCases.length,
    };
  }

  const matchedCaseIndex = normalizedCases.findIndex((testCase) =>
    inputIds.every(
      (inputId) =>
        normalizeValue(getFillTaskCaseValue(testCase, inputId)) === normalizeValue(answers[inputId])
    )
  );

  return {
    passed: matchedCaseIndex !== -1,
    matchedCaseIndex: matchedCaseIndex === -1 ? null : matchedCaseIndex,
    totalCases: normalizedCases.length,
  };
};
