"use client";

import styles from "./index.module.scss";

export const getRequiredExp = (level: number) => Math.pow(10, level - 1);

type StudentLevelWheelProps = {
  level: number;
  experience: number;
};

export default function StudentLevelWheel({ level, experience }: StudentLevelWheelProps) {
  const CIRCLE_SIZE = 150;
  const strokeWidth = 8;
  const center = CIRCLE_SIZE / 2;
  const radius = (CIRCLE_SIZE / 2) * 0.85;
  const circumference = 2 * Math.PI * radius;
  const requiredExp = getRequiredExp(level);
  const clampedProgress = Math.min(Math.max(experience / requiredExp, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <div className={styles.wheel}>
      <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e9ecef"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#48bb78"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
        <text
          x={center}
          y={center - 8}
          fontSize="24"
          fontWeight="bold"
          fill="#212529"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {level}
        </text>
        <text
          x={center}
          y={center + 16}
          fontSize="12"
          fill="#6c757d"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          УРОВЕНЬ
        </text>
      </svg>

      <div className={styles.expInfo}>
        <span className={styles.expValue}>{experience}</span>
        <span className={styles.expSeparator}>/</span>
        <span className={styles.expTotal}>{requiredExp}</span>
        <span className={styles.expLabel}>XP</span>
      </div>
    </div>
  );
}
