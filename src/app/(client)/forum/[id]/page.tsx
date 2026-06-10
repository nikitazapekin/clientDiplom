"use client";

import { useParams } from "next/navigation";

import ForumQuestionView from "@/app/components/ForumQuestionView";

const ForumQuestionPage = () => {
  const params = useParams<{ id: string }>();
  const questionId = params.id;

  if (!questionId) {
    return null;
  }

  return <ForumQuestionView questionId={questionId} />;
};

export default ForumQuestionPage;
