"use client";

import { useParams } from "next/navigation";

import ArticleView from "@/app/components/ArticleView";

const ArticlePage = () => {
  const params = useParams<{ id: string }>();
  const articleId = params.id;

  if (!articleId) {
    return null;
  }

  return <ArticleView articleId={articleId} />;
};

export default ArticlePage;
