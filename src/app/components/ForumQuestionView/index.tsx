"use client";

import { useCallback, useEffect, useState } from "react";
import DislikeIcon from "@assets/icons/utils/dislike.png";
import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "../CommunityHub/index.module.scss";

import CommunityThread from "@/app/components/CommunityThread";
import { AuthService } from "@/app/http/auth";
import forumService from "@/app/http/forum";
import type { CommunityComment, ForumQuestion, ForumQuestionStatus } from "@/app/http/types/community";

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

interface ForumQuestionViewProps {
  questionId: string;
}

const ForumQuestionView = ({ questionId }: ForumQuestionViewProps) => {
  const router = useRouter();
  const [question, setQuestion] = useState<ForumQuestion | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [editingComment, setEditingComment] = useState<CommunityComment | null>(null);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadQuestion = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await forumService.getQuestionById(questionId);
      const user = AuthService.getCurrentUser();

      setCurrentUserId(user.userId);
      setQuestion(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить вопрос");
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

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
        await forumService.updateComment(editingComment.id, {
          content: composerText.trim(),
        });
      } else {
        await forumService.createComment(questionId, {
          content: composerText.trim(),
          parentId: replyTo?.id ?? null,
        });
      }

      resetComposer();
      await loadQuestion();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить ответ");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!question) {
      return;
    }

    const nextStatus: ForumQuestionStatus = question.status === "open" ? "closed" : "open";

    try {
      setActionLoading(true);
      await forumService.updateQuestionStatus(question.id, nextStatus);
      await loadQuestion();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Не удалось поменять статус");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteQuestion = async () => {
    if (!question || !window.confirm("Удалить вопрос? Ответы тоже будут удалены.")) {
      return;
    }

    try {
      setActionLoading(true);
      await forumService.deleteQuestion(question.id);
      router.push("/forum");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить вопрос");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteComment = (comment: CommunityComment) => {
    if (!window.confirm("Удалить ответ? Вложенные ответы тоже будут удалены.")) {
      return;
    }

    void (async () => {
      try {
        await forumService.deleteComment(comment.id);
        await loadQuestion();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить ответ");
      }
    })();
  };

  const startEditingQuestion = () => {
    if (!question) {
      return;
    }

    setEditTitle(question.title);
    setEditContent(question.content);
    setEditTags(question.tags.join(", "));
    setIsEditingQuestion(true);
  };

  const cancelEditingQuestion = () => {
    setIsEditingQuestion(false);
    setEditTitle("");
    setEditContent("");
    setEditTags("");
  };

  const saveQuestion = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError("Заполни заголовок и описание вопроса.");

      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      await forumService.updateQuestion(questionId, {
        title: editTitle.trim(),
        content: editContent.trim(),
        tags: parseTags(editTags),
      });

      setIsEditingQuestion(false);
      await loadQuestion();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить вопрос");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVote = async (mode: "like" | "dislike") => {
    if (!question) {
      return;
    }

    try {
      const updated =
        mode === "like"
          ? await forumService.toggleQuestionLike(question.id)
          : await forumService.toggleQuestionDislike(question.id);

      setQuestion((current) => (current ? { ...current, ...updated } : current));
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Не удалось обновить реакцию");
    }
  };

  const canManageQuestion = Boolean(question && currentUserId === question.authorId);

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.backRow}>
          <button className={styles.backButton} onClick={() => router.push("/forum")} type="button">
            К списку вопросов
          </button>
        </div>

        {loading ? (
          <section className={styles.state}>
            <p className={styles.message}>Загружаю вопрос...</p>
          </section>
        ) : error && !question ? (
          <section className={styles.state}>
            <p className={styles.error}>{error}</p>
            <div className={styles.formActions}>
              <button className={styles.secondaryButton} onClick={() => void loadQuestion()} type="button">
                Повторить
              </button>
            </div>
          </section>
        ) : question ? (
          <>
            <article className={styles.card}>
              <div className={styles.cardTop}>
                <span
                  className={`${styles.statusPill} ${
                    question.status === "closed" ? styles.statusClosed : styles.statusOpen
                  }`}
                >
                  {question.status === "closed" ? "Закрыт" : "Открыт"}
                </span>
                <span className={styles.cardDate}>{formatDate(question.createdAt)}</span>
              </div>

              {isEditingQuestion ? (
                <div className={styles.fields}>
                  <input
                    className={styles.input}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Заголовок вопроса"
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
                    placeholder="Опиши проблему или вопрос"
                    value={editContent}
                  />
                  <div className={styles.formActions}>
                    <button
                      className={styles.primaryButton}
                      disabled={actionLoading}
                      onClick={() => void saveQuestion()}
                      type="button"
                    >
                      Сохранить
                    </button>
                    <button className={styles.ghostButton} onClick={cancelEditingQuestion} type="button">
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className={styles.cardTitle}>{question.title}</h1>
                  <p className={styles.detailBody}>{question.content}</p>

                  <div className={styles.tags}>
                    {question.tags.map((item) => (
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
                    className={`${styles.voteButton} ${question.hasLiked ? styles.voteButtonActive : ""}`}
                    onClick={() => void handleVote("like")}
                    type="button"
                  >
                    <Image
                      alt="Лайк"
                      className={`${styles.voteIcon} ${styles.voteIconRotated}`}
                      src={DislikeIcon}
                    />
                    <span>{question.likes}</span>
                  </button>
                  <button
                    className={`${styles.voteButton} ${question.hasDisliked ? styles.voteButtonActive : ""}`}
                    onClick={() => void handleVote("dislike")}
                    type="button"
                  >
                    <Image alt="Дизлайк" className={styles.voteIcon} src={DislikeIcon} />
                    <span>{question.dislikes}</span>
                  </button>
                </div>

                <span className={styles.author}>{question.authorName}</span>
                <span className={styles.meta}>{question.commentsCount} ответов</span>
              </div>

              {canManageQuestion && !isEditingQuestion ? (
                <div className={styles.manageRow}>
                  <button className={styles.editButton} onClick={startEditingQuestion} type="button">
                    Редактировать
                  </button>
                  <button className={styles.outlineButton} onClick={() => void toggleStatus()} type="button">
                    {question.status === "open" ? "Отметить решённым" : "Переоткрыть"}
                  </button>
                  <button className={styles.dangerButton} onClick={() => void deleteQuestion()} type="button">
                    Удалить
                  </button>
                </div>
              ) : null}
            </article>

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ответы</h2>
              {actionLoading ? <span className={styles.message}>Сохраняю...</span> : null}
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <CommunityThread
              comments={question.comments || []}
              currentUserId={currentUserId}
              emptyText="Пока никто не ответил на вопрос."
              onDelete={deleteComment}
              onDislike={async (commentId) => {
                await forumService.toggleCommentDislike(commentId);
                await loadQuestion();
              }}
              onEdit={(comment) => {
                setEditingComment(comment);
                setReplyTo(null);
                setComposerText(comment.content);
              }}
              onLike={async (commentId) => {
                await forumService.toggleCommentLike(commentId);
                await loadQuestion();
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
                  ? "Редактирование ответа"
                  : replyTo
                    ? `Ответ для ${replyTo.authorName}`
                    : "Новый ответ"}
              </h3>

              {replyTo || editingComment ? (
                <button className={styles.cancelLink} onClick={resetComposer} type="button">
                  Сбросить режим
                </button>
              ) : null}

              <textarea
                className={styles.textarea}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder="Напиши ответ, идею решения или уточняющий вопрос"
                value={composerText}
              />

              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  disabled={!composerText.trim() || actionLoading}
                  onClick={() => void submitComment()}
                  type="button"
                >
                  {editingComment ? "Сохранить ответ" : "Отправить ответ"}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default ForumQuestionView;
