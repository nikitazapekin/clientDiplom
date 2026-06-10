"use client";

import DislikeIcon from "@assets/icons/utils/dislike.png";
import Image from "next/image";

import styles from "./index.module.scss";

import type { CommunityComment } from "@/app/http/types/community";

interface CommunityThreadProps {
  comments: CommunityComment[];
  currentUserId?: string | null;
  emptyText?: string;
  onReply: (comment: CommunityComment) => void;
  onEdit: (comment: CommunityComment) => void;
  onDelete: (comment: CommunityComment) => void;
  onLike: (commentId: string) => void;
  onDislike: (commentId: string) => void;
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
  onEdit,
  onDelete,
  onLike,
  onDislike,
}: {
  comment: CommunityComment;
  currentUserId?: string | null;
  depth: number;
  onReply: (comment: CommunityComment) => void;
  onEdit: (comment: CommunityComment) => void;
  onDelete: (comment: CommunityComment) => void;
  onLike: (commentId: string) => void;
  onDislike: (commentId: string) => void;
}) {
  const isOwn = currentUserId === comment.authorId;

  return (
    <div className={depth > 0 ? styles.replyContainer : undefined}>
      <div className={`${styles.commentCard} ${depth > 0 ? styles.replyCard : ""}`}>
        <div className={styles.commentHeader}>
          <span className={styles.authorName}>{comment.authorName}</span>
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

          <button className={styles.linkButton} onClick={() => onReply(comment)} type="button">
            Ответить
          </button>

          {isOwn ? (
            <>
              <button className={styles.linkButton} onClick={() => onEdit(comment)} type="button">
                Изменить
              </button>
              <button
                className={`${styles.linkButton} ${styles.dangerText}`}
                onClick={() => onDelete(comment)}
                type="button"
              >
                Удалить
              </button>
            </>
          ) : null}
        </div>

        {comment.replies.length > 0 ? (
          <div className={styles.repliesWrap}>
            {comment.replies.map((reply) => (
              <CommentNode
                comment={reply}
                currentUserId={currentUserId}
                depth={depth + 1}
                key={reply.id}
                onDelete={onDelete}
                onDislike={onDislike}
                onEdit={onEdit}
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

const CommunityThread = ({
  comments,
  currentUserId,
  emptyText = "Пока нет комментариев.",
  onReply,
  onEdit,
  onDelete,
  onLike,
  onDislike,
}: CommunityThreadProps) => {
  if (!comments.length) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateText}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={styles.thread}>
      {comments.map((comment) => (
        <CommentNode
          comment={comment}
          currentUserId={currentUserId}
          depth={0}
          key={comment.id}
          onDelete={onDelete}
          onDislike={onDislike}
          onEdit={onEdit}
          onLike={onLike}
          onReply={onReply}
        />
      ))}
    </div>
  );
};

export default CommunityThread;
