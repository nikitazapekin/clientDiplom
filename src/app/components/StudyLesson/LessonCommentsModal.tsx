"use client";

import { useCallback, useEffect, useState } from "react";
import DislikeIcon from "@assets/icons/utils/dislike.png";
import Image from "next/image";

import styles from "./comments.module.scss";

import {
  type LessonComment,
  LessonCommentsService,
} from "@/app/http/lessonCommentsService";

interface LessonCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonDetailsId: string | null;
  currentUserId: string | null;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function CommentNode({
  comment,
  currentUserId,
  depth,
  onReply,
  onLike,
  onDislike,
}: {
  comment: LessonComment;
  currentUserId: string | null;
  depth: number;
  onReply: (comment: LessonComment) => void;
  onLike: (commentId: string) => void;
  onDislike: (commentId: string) => void;
}) {
  return (
    <div className={depth > 0 ? styles.replyContainer : undefined}>
      <div className={`${styles.commentCard} ${depth > 0 ? styles.replyCard : ""}`}>
        <div className={styles.commentHeader}>
          <span className={styles.authorName}>Пользователь</span>
          <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
        </div>

        <p className={styles.commentText}>{comment.content}</p>

        <div className={styles.actionsRow}>
          <button
            className={`${styles.commentAction} ${comment.hasLiked ? styles.commentActionActive : ""}`}
            onClick={() => onLike(comment.id)}
            type="button"
          >
            <Image
              alt="Лайк"
              className={`${styles.commentActionIcon} ${styles.commentActionIconRotated}`}
              src={DislikeIcon}
            />
            <span>{comment.likes}</span>
          </button>

          <button
            className={`${styles.commentAction} ${comment.hasDisliked ? styles.commentActionActive : ""}`}
            onClick={() => onDislike(comment.id)}
            type="button"
          >
            <Image alt="Дизлайк" className={styles.commentActionIcon} src={DislikeIcon} />
            <span>{comment.dislikes}</span>
          </button>

          {currentUserId ? (
            <button className={styles.linkButton} onClick={() => onReply(comment)} type="button">
              Ответить
            </button>
          ) : null}
        </div>

        {comment.replies && comment.replies.length > 0 ? (
          <div className={styles.repliesWrap}>
            {comment.replies.map((reply) => (
              <CommentNode
                comment={reply}
                currentUserId={currentUserId}
                depth={depth + 1}
                key={reply.id}
                onDislike={onDislike}
                onLike={onLike}
                onReply={onReply}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const LessonCommentsModal = ({
  isOpen,
  onClose,
  lessonDetailsId,
  currentUserId,
}: LessonCommentsModalProps) => {
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [canComment, setCanComment] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<LessonComment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    if (!lessonDetailsId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await LessonCommentsService.getComments(lessonDetailsId);

      setComments(response.comments);
      setCanComment(response.canComment);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить комментарии");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [lessonDetailsId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadComments();
  }, [isOpen, loadComments]);

  const handleSubmit = async () => {
    if (!lessonDetailsId || !draft.trim() || !canComment) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await LessonCommentsService.createComment({
        lessonDetailsId,
        content: draft.trim(),
        parentId: replyTo?.id,
      });

      setDraft("");
      setReplyTo(null);
      await loadComments();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : "Не удалось отправить комментарий",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await LessonCommentsService.toggleLike(commentId);
      await loadComments();
    } catch (likeError: unknown) {
      setError(likeError instanceof Error ? likeError.message : "Не удалось поставить лайк");
    }
  };

  const handleDislike = async (commentId: string) => {
    try {
      await LessonCommentsService.toggleDislike(commentId);
      await loadComments();
    } catch (dislikeError: unknown) {
      setError(dislikeError instanceof Error ? dislikeError.message : "Не удалось поставить дизлайк");
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Комментарии</h3>
          <button className={styles.closeButton} onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading ? <p className={styles.emptyState}>Загрузка...</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          {!loading && comments.length === 0 ? (
            <p className={styles.emptyState}>Пока нет комментариев к уроку.</p>
          ) : null}

          <div className={styles.thread}>
            {comments.map((comment) => (
              <CommentNode
                comment={comment}
                currentUserId={currentUserId}
                depth={0}
                key={comment.id}
                onDislike={handleDislike}
                onLike={handleLike}
                onReply={setReplyTo}
              />
            ))}
          </div>

          {canComment ? (
            <div className={styles.form}>
              {replyTo ? (
                <p className={styles.replyHint}>
                  Ответ на комментарий.{" "}
                  <button className={styles.linkButton} onClick={() => setReplyTo(null)} type="button">
                    Отмена
                  </button>
                </p>
              ) : null}
              <textarea
                className={styles.textarea}
                placeholder="Напишите комментарий..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                className={styles.submitButton}
                disabled={submitting || !draft.trim()}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LessonCommentsModal;
