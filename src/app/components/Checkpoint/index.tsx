"use client";

import StudyLesson from "../StudyLesson";

interface CheckpointProps {
  courseId: string;
  checkpointId: string;
}

export default function Checkpoint({ courseId, checkpointId }: CheckpointProps) {
  return <StudyLesson courseId={courseId} checkpointId={checkpointId} mode="checkpoint" />;
}
