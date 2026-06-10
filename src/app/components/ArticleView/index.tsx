"use client";

import { useCallback, useEffect, useState } from "react";
import DislikeIcon from "@assets/icons/utils/dislike.png";
import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "../CommunityHub/index.module.scss";

import ArticleContentRenderer from "@/app/components/ArticleContentRenderer";
import CommunityThread from "@/app/components/CommunityThread";
import articlesService from "@/app/http/articles";
import { AuthService } from "@/app/http/auth";
import type { Article, CommunityComment } from "@/app/http/types/community";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const parseTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);

const getArticleText = (article: Article) =>
  (article.contentBlocks || [])
    .filter((block) => block.type === "text")
    .map((block) => String(block.data?.text || ""))
    .join("\n\n");

interface ArticleViewProps {
  articleId: string;
}

const ArticleView = ({ articleId }: ArticleViewProps) => {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [editingComment, setEditingComment] = useState<CommunityComment | null>(null);
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadArticle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await articlesService.getArticleById(articleId);
      const user = AuthService.getCurrentUser();

      setCurrentUserId(user.userId);
      setArticle(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить статью");
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void loadArticle();
  }, [loadArticle]);

  const resetComposer = () => {
    setComposerText("");
    setReplyTo(null);
    setEditingComment(null);
  };

  const submitComment = async () => {
    if (!composerText.trim()) {
      return;
    }

    try {
      setActionLoading(true);

      if (editingComment) {
        await articlesService.updateComment(editingComment.id, {
          content: composerText.trim(),
        });
      } else {
        await articlesService.createComment(articleId, {
          content: composerText.trim(),
          parentId: replyTo?.id ?? null,
        });
      }

      resetComposer();
      await loadArticle();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить комментарий");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteArticle = async () => {
    if (!article || !window.confirm("Удалить статью? Комментарии тоже будут удалены.")) {
      return;
    }

    try {
      setActionLoading(true);
      await articlesService.deleteArticle(article.id);
      router.push("/articles");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить статью");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteComment = (comment: CommunityComment) => {
    if (!window.confirm("Удалить комментарий? Вложенные ответы тоже будут удалены.")) {
      return;
    }

    void (async () => {
      try {
        await articlesService.deleteComment(comment.id);
        await loadArticle();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить комментарий");
      }
    })();
  };

  const startEditingArticle = () => {
    if (!article) {
      return;
    }

    setEditTitle(article.title);
    setEditContent(getArticleText(article));
    setEditTags(article.tags.join(", "));
    setIsEditingArticle(true);
  };

  const cancelEditingArticle = () => {
    setIsEditingArticle(false);
    setEditTitle("");
    setEditContent("");
    setEditTags("");
  };

  const saveArticle = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError("Заполни название и текст статьи.");

      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      await articlesService.updateArticle(articleId, {
        title: editTitle.trim(),
        tags: parseTags(editTags),
        contentBlocks: [
          {
            type: "text",
            data: { text: editContent.trim() },
          },
        ],
      });

      setIsEditingArticle(false);
      await loadArticle();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить статью");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVote = async (mode: "like" | "dislike") => {
    if (!article) {
      return;
    }

    try {
      const updated =
        mode === "like"
          ? await articlesService.toggleLike(article.id)
          : await articlesService.toggleDislike(article.id);

      setArticle((current) => (current ? { ...current, ...updated } : current));
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Не удалось обновить реакцию");
    }
  };

  const canManageArticle = Boolean(article && currentUserId === article.authorId);

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.backRow}>
          <button className={styles.backButton} onClick={() => router.push("/articles")} type="button">
            К списку статей
          </button>
        </div>

        {loading ? (
          <section className={styles.state}>
            <p className={styles.message}>Загружаю статью...</p>
          </section>
        ) : error && !article ? (
          <section className={styles.state}>
            <p className={styles.error}>{error}</p>
            <div className={styles.formActions}>
              <button className={styles.secondaryButton} onClick={() => void loadArticle()} type="button">
                Повторить
              </button>
            </div>
          </section>
        ) : article ? (
          <>
            <article className={styles.card}>
              {isEditingArticle ? (
                <div className={styles.fields}>
                  <input
                    className={styles.input}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Название статьи"
                    value={editTitle}
                  />
                  <input
                    className={styles.input}
                    onChange={(event) => setEditTags(event.target.value)}
                    placeholder="Теги через запятую"
                    value={editTags}
                  />
                  <textarea
                    className={styles.textarea}
                    onChange={(event) => setEditContent(event.target.value)}
                    placeholder="Текст статьи"
                    value={editContent}
                  />
                  <div className={styles.formActions}>
                    <button
                      className={styles.primaryButton}
                      disabled={actionLoading}
                      onClick={() => void saveArticle()}
                      type="button"
                    >
                      Сохранить
                    </button>
                    <button className={styles.ghostButton} onClick={cancelEditingArticle} type="button">
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className={styles.cardTitle}>{article.title}</h1>
                  <p className={styles.detailDate}>{formatDate(article.createdAt)}</p>

                  <div className={styles.tags}>
                    {article.tags.map((item) => (
                      <span className={styles.tag} key={item}>
                        #{item}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className={styles.detailMetaRow}>
                <div className={styles.voteRow}>
                  <button
                    className={`${styles.voteButton} ${article.hasLiked ? styles.voteButtonActive : ""}`}
                    onClick={() => void handleVote("like")}
                    type="button"
                  >
                    <Image
                      alt="Лайк"
                      className={`${styles.voteIcon} ${styles.voteIconRotated}`}
                      src={DislikeIcon}
                    />
                    <span>{article.likes}</span>
                  </button>
                  <button
                    className={`${styles.voteButton} ${article.hasDisliked ? styles.voteButtonActive : ""}`}
                    onClick={() => void handleVote("dislike")}
                    type="button"
                  >
                    <Image alt="Дизлайк" className={styles.voteIcon} src={DislikeIcon} />
                    <span>{article.dislikes}</span>
                  </button>
                </div>

                <span className={styles.author}>{article.authorName}</span>
              </div>

              {canManageArticle && !isEditingArticle ? (
                <div className={styles.manageRow}>
                  <button className={styles.editButton} onClick={startEditingArticle} type="button">
                    Редактировать
                  </button>
                  <button className={styles.dangerButton} onClick={() => void deleteArticle()} type="button">
                    Удалить
                  </button>
                </div>
              ) : null}
            </article>

            {!isEditingArticle ? (
              <section className={`${styles.panel} ${styles.contentPanel}`}>
                <h2 className={styles.sectionTitle}>Содержимое</h2>
                <ArticleContentRenderer blocks={article.contentBlocks || []} />
              </section>
            ) : null}

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Обсуждение</h2>
              {actionLoading ? <span className={styles.message}>Сохраняю...</span> : null}
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <CommunityThread
              comments={article.comments || []}
              currentUserId={currentUserId}
              emptyText="Пока нет комментариев к статье."
              onDelete={deleteComment}
              onDislike={async (commentId) => {
                await articlesService.toggleCommentDislike(commentId);
                await loadArticle();
              }}
              onEdit={(comment) => {
                setEditingComment(comment);
                setReplyTo(null);
                setComposerText(comment.content);
              }}
              onLike={async (commentId) => {
                await articlesService.toggleCommentLike(commentId);
                await loadArticle();
              }}
              onReply={(comment) => {
                setReplyTo(comment);
                setEditingComment(null);
                setComposerText("");
              }}
            />

            <section className={`${styles.panel} ${styles.composerCard}`}>
              <h3 className={styles.composerTitle}>
                {editingComment
                  ? "Редактирование комментария"
                  : replyTo
                    ? `Ответ для ${replyTo.authorName}`
                    : "Новый комментарий"}
              </h3>

              {replyTo || editingComment ? (
                <button className={styles.cancelLink} onClick={resetComposer} type="button">
                  Сбросить режим
                </button>
              ) : null}

              <textarea
                className={styles.textarea}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder="Добавь мысль, уточнение или обратную связь по статье"
                value={composerText}
              />

              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  disabled={!composerText.trim() || actionLoading}
                  onClick={() => void submitComment()}
                  type="button"
                >
                  {editingComment ? "Сохранить комментарий" : "Отправить комментарий"}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default ArticleView;
