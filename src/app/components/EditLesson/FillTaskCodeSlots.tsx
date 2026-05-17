import { type DragEvent, useMemo } from "react";

import { getFillTaskOptionValue, tokenizeFillTaskTemplate } from "./fillTaskUtils";
import styles from "./index.module.scss";
import type { FillCodeTaskOption } from "./types";

interface FillTaskCodeSlotsProps {
  templateCode: string;
  answers: Record<string, string>;
  options: FillCodeTaskOption[];
  onAssign?: (slotId: string, optionId: string | null) => void;
  selectedOptionId?: string | null;
  readOnly?: boolean;
}

export function FillTaskCodeSlots({
  templateCode,
  answers,
  options,
  onAssign,
  selectedOptionId,
  readOnly,
}: FillTaskCodeSlotsProps) {
  const templateLines = useMemo(() => tokenizeFillTaskTemplate(templateCode ?? ""), [templateCode]);

  const handleDrop = (event: DragEvent<HTMLButtonElement>, slotId: string) => {
    if (!onAssign || readOnly) {
      return;
    }

    event.preventDefault();
    const optionId = event.dataTransfer.getData("text/plain");

    if (optionId) {
      onAssign(slotId, optionId);
    }
  };

  const handleSlotClick = (slotId: string) => {
    if (!onAssign || readOnly) {
      return;
    }

    if (selectedOptionId) {
      onAssign(slotId, selectedOptionId);

      return;
    }

    if (answers[slotId]) {
      onAssign(slotId, null);
    }
  };

  return (
    <div className={styles.fillTaskCodeSurface}>
      {templateLines.map((segments, lineIndex) => (
        <div key={`fill-task-line-${lineIndex}`} className={styles.fillTaskCodeLine}>
          {segments.map((segment, segmentIndex) => {
            if (segment.type === "text") {
              return (
                <span
                  key={`segment-${lineIndex}-${segmentIndex}`}
                  className={styles.fillTaskCodeText}
                >
                  {segment.value || "\u00a0"}
                </span>
              );
            }

            const slotId = segment.value;
            const optionValue = getFillTaskOptionValue(options, answers[slotId]);
            const isFilled = Boolean(optionValue);

            return (
              <button
                key={`slot-${lineIndex}-${segmentIndex}`}
                type="button"
                className={`${styles.fillTaskSlot} ${isFilled ? styles.fillTaskSlotFilled : ""}`}
                onDragOver={(event) => {
                  if (!readOnly) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => handleDrop(event, slotId)}
                onClick={() => handleSlotClick(slotId)}
                disabled={readOnly}
                title={slotId}
              >
                {optionValue || "\u00a0"}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
