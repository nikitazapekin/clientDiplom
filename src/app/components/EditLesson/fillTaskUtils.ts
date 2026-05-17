import type { FillCodeTaskBlock, FillCodeTaskCase, FillCodeTaskOption } from "./types";

export interface FillTaskValidationResult {
  passed: boolean;
  matchedCaseIndex: number | null;
  totalCases: number;
}

export interface FillTaskTemplateSegment {
  type: "text" | "slot";
  value: string;
}

export const FILL_TASK_PLACEHOLDER_REGEX = /\[\[([\w-]+)\]\]|\[(input[\w-]*)\]/g;

const normalizeValue = (value: string | undefined | null): string => (value ?? "").trim();

const createSlug = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "option";
};

const buildLegacyOptionId = (value: string, index: number): string =>
  `fill_option_${createSlug(value)}_${index + 1}`;

const getCaseValueSlotId = (value: { slotId?: string; inputId?: string }): string =>
  value.slotId ?? value.inputId ?? "";

const findOptionIdByValue = (
  options: FillCodeTaskOption[],
  value: string | undefined
): string | null => {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return null;
  }

  const matchedOption = options.find((option) => normalizeValue(option.value) === normalized);

  return matchedOption?.id ?? null;
};

const normalizeOptions = (
  options: FillCodeTaskOption[] | undefined,
  testCases: FillCodeTaskCase[] | undefined
): FillCodeTaskOption[] => {
  const normalizedOptions: FillCodeTaskOption[] = (options ?? []).map((option, index) => {
    if (typeof option === "string") {
      return {
        id: `fill_option_${index + 1}`,
        value: option,
      };
    }

    return {
      id: option.id || `fill_option_${index + 1}`,
      value: option.value ?? "",
    };
  });

  const seenValues = new Set(normalizedOptions.map((option) => normalizeValue(option.value)));

  (testCases ?? []).forEach((testCase) => {
    (testCase.values ?? []).forEach((caseValue) => {
      const normalizedCaseValue = normalizeValue(caseValue.value);

      if (!normalizedCaseValue || seenValues.has(normalizedCaseValue)) {
        return;
      }

      normalizedOptions.push({
        id: buildLegacyOptionId(normalizedCaseValue, normalizedOptions.length),
        value: caseValue.value ?? "",
      });
      seenValues.add(normalizedCaseValue);
    });
  });

  return normalizedOptions;
};

export const extractFillTaskInputs = (templateCode: string): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const match of templateCode.matchAll(FILL_TASK_PLACEHOLDER_REGEX)) {
    const inputId = match[1] ?? match[2];

    if (!inputId || seen.has(inputId)) {
      continue;
    }

    seen.add(inputId);
    result.push(inputId);
  }

  return result;
};

export const tokenizeFillTaskTemplate = (templateCode: string): FillTaskTemplateSegment[][] => {
  return templateCode.split("\n").map((line) => {
    const segments: FillTaskTemplateSegment[] = [];
    let lastIndex = 0;

    for (const match of line.matchAll(FILL_TASK_PLACEHOLDER_REGEX)) {
      const fullMatch = match[0];
      const slotId = match[1] ?? match[2];
      const matchIndex = match.index ?? 0;

      if (matchIndex > lastIndex) {
        segments.push({
          type: "text",
          value: line.slice(lastIndex, matchIndex),
        });
      }

      segments.push({
        type: "slot",
        value: slotId ?? fullMatch,
      });

      lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < line.length) {
      segments.push({
        type: "text",
        value: line.slice(lastIndex),
      });
    }

    if (segments.length === 0) {
      segments.push({
        type: "text",
        value: "",
      });
    }

    return segments;
  });
};

export const createEmptyFillTaskCase = (id: string, slotIds: string[]): FillCodeTaskCase => ({
  id,
  values: slotIds.map((slotId) => ({
    slotId,
    optionId: null,
  })),
});

export const syncFillTaskTestCases = (
  testCases: FillCodeTaskCase[] | undefined,
  slotIds: string[],
  options: FillCodeTaskOption[] | undefined = []
): FillCodeTaskCase[] => {
  const normalizedOptions = normalizeOptions(options, testCases);

  return (testCases ?? []).map((testCase, index) => {
    const valuesMap = new Map(
      (testCase.values ?? []).map((value) => [
        getCaseValueSlotId(value as { slotId?: string; inputId?: string }),
        value,
      ])
    );

    return {
      ...testCase,
      id: testCase.id || `fill_case_${index + 1}`,
      values: slotIds.map((slotId) => {
        const currentValue = valuesMap.get(slotId);
        const resolvedOptionId =
          currentValue?.optionId &&
          normalizedOptions.some((option) => option.id === currentValue.optionId)
            ? currentValue.optionId
            : findOptionIdByValue(normalizedOptions, currentValue?.value);

        return {
          slotId,
          optionId: resolvedOptionId,
        };
      }),
    };
  });
};

export const normalizeFillTaskBlock = (block: FillCodeTaskBlock): FillCodeTaskBlock => {
  const slotIds = extractFillTaskInputs(block.templateCode ?? "");
  const options = normalizeOptions(block.options, block.testCases);

  return {
    ...block,
    options,
    testCases: syncFillTaskTestCases(block.testCases, slotIds, options),
  };
};

export const getFillTaskCaseOptionId = (
  testCase: FillCodeTaskCase,
  slotId: string
): string | null => {
  return (
    testCase.values.find(
      (value) => getCaseValueSlotId(value as { slotId?: string; inputId?: string }) === slotId
    )?.optionId ?? null
  );
};

export const getFillTaskOptionValue = (
  options: FillCodeTaskOption[] | undefined,
  optionId: string | null | undefined
): string => {
  if (!optionId) {
    return "";
  }

  return options?.find((option) => option.id === optionId)?.value ?? "";
};

export const validateFillTaskAnswers = (
  testCases: FillCodeTaskCase[] | undefined,
  answers: Record<string, string>,
  slotIds: string[],
  options: FillCodeTaskOption[] | undefined = []
): FillTaskValidationResult => {
  const normalizedOptions = normalizeOptions(options, testCases);
  const normalizedCases = syncFillTaskTestCases(testCases, slotIds, normalizedOptions);

  if (normalizedCases.length === 0 || slotIds.length === 0) {
    return {
      passed: false,
      matchedCaseIndex: null,
      totalCases: normalizedCases.length,
    };
  }

  const normalizedAnswers = Object.fromEntries(
    slotIds.map((slotId) => {
      const optionId = normalizedOptions.some((option) => option.id === answers[slotId])
        ? answers[slotId]
        : findOptionIdByValue(normalizedOptions, answers[slotId]);

      return [slotId, optionId ?? ""];
    })
  );

  const matchedCaseIndex = normalizedCases.findIndex((testCase) =>
    slotIds.every(
      (slotId) =>
        normalizeValue(getFillTaskCaseOptionId(testCase, slotId)) ===
        normalizeValue(normalizedAnswers[slotId])
    )
  );

  return {
    passed: matchedCaseIndex !== -1,
    matchedCaseIndex: matchedCaseIndex === -1 ? null : matchedCaseIndex,
    totalCases: normalizedCases.length,
  };
};
