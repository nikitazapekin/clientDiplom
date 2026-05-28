"use client";

import { useEffect, useState } from "react";
import DislikeIcon from "@assets/icons/utils/dislike.png";
import Image from "next/image";

import styles from "../CommunityHub/index.module.scss";

import forumService from "@/app/http/forum";
import type { ForumQuestion, ForumQuestionStatus } from "@/app/http/types/community";

const statusOptions: { label: string; value?: ForumQuestionStatus }[] = [
  { label: "Все", value: undefined },
  { label: "Открытые", value: "open" },
  { label: "Закрытые", value: "closed" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const parseTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);

const ForumHub = () => {
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState<ForumQuestionStatus | undefined>();
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadQuestions = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await forumService.getQuestions({
        limit: 50,
        page: 1,
        search: search.trim() || undefined,
        status,
        tag: tag.trim() || undefined,
      });

      setQuestions(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить форум");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        setError(null);
        setLoading(true);

        const response = await forumService.getQuestions({
          limit: 50,
          page: 1,
        });

        setQuestions(response.items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить форум");
      } finally {
        setLoading(false);
      }
    };

    void initialLoad();
  }, []);

  const resetForm = () => {
    setTitle("");
    setTagsInput("");
    setContent("");
    setFormError(null);
  };

  const handleCreateQuestion = async () => {
    if (!title.trim() || !content.trim()) {
      setFormError("Заполни заголовок и описание вопроса.");

      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await forumService.createQuestion({
        title: title.trim(),
        content: content.trim(),
        tags: parseTags(tagsInput),
      });

      resetForm();
      setIsComposerOpen(false);
      await loadQuestions();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "Не удалось создать вопрос");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (questionId: string, mode: "like" | "dislike") => {
    try {
      const updated =
        mode === "like"
          ? await forumService.toggleQuestionLike(questionId)
          : await forumService.toggleQuestionDislike(questionId);

      setQuestions((current) =>
        current.map((question) => (question.id === questionId ? { ...question, ...updated } : question)),
      );
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Не удалось обновить реакцию");
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroBlock}>
         
            <h1 className={styles.title}>Вопросы по курсам, задачам и коду</h1>
            <p className={styles.lead}>
              Создавай темы, фильтруй обсуждения и поднимай полезные вопросы реакциями сообщества.
            </p>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                onClick={() => setIsComposerOpen((current) => !current)}
                type="button"
              >
                {isComposerOpen ? "Скрыть форму" : "Задать вопрос"}
              </button>
            </div>
          </div>
        </section>

        {isComposerOpen && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Новый вопрос</h2>
                <p className={styles.panelText}>Формат как в мобильном экране: заголовок, содержание и теги.</p>
              </div>
            </div>

            <div className={styles.fields}>
              <input
                className={styles.input}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Заголовок вопроса"
                value={title}
              />
              <input
                className={styles.input}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="Теги через запятую: js, backend, sql"
                value={tagsInput}
              />
              <textarea
                className={styles.textarea}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Опиши проблему или вопрос"
                value={content}
              />
              {formError ? <p className={styles.error}>{formError}</p> : null}
              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  disabled={submitting}
                  onClick={() => void handleCreateQuestion()}
                  type="button"
                >
                  {submitting ? "Публикую..." : "Опубликовать вопрос"}
                </button>
                <button
                  className={styles.ghostButton}
                  onClick={() => {
                    resetForm();
                    setIsComposerOpen(false);
                  }}
                  type="button"
                >
                  Отмена
                </button>
              </div>
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Фильтры</h2>
              <p className={styles.panelText}>Поиск по заголовку, тегу и статусу вопроса.</p>
            </div>
          </div>

          <div className={styles.filters}>
            <div className={styles.splitFields}>
              <input
                className={styles.input}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по названию"
                value={search}
              />
              <input
                className={styles.input}
                onChange={(event) => setTag(event.target.value)}
                placeholder="Фильтр по тегу"
                value={tag}
              />
            </div>

            <div className={styles.statusRow}>
              {statusOptions.map((option) => (
                <button
                  className={`${styles.statusButton} ${option.value === status ? styles.statusButtonActive : ""}`}
                  key={option.label}
                  onClick={() => setStatus(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={styles.formActions}>
              <button className={styles.secondaryButton} onClick={() => void loadQuestions()} type="button">
                Применить фильтры
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <section className={styles.state}>
            <p className={styles.message}>Загружаю вопросы...</p>
          </section>
        ) : error ? (
          <section className={styles.state}>
            <p className={styles.error}>{error}</p>
            <div className={styles.formActions}>
              <button className={styles.secondaryButton} onClick={() => void loadQuestions()} type="button">
                Повторить
              </button>
            </div>
          </section>
        ) : questions.length === 0 ? (
          <section className={styles.state}>
            <p className={styles.message}>По этим фильтрам вопросов не найдено.</p>
          </section>
        ) : (
          <section className={styles.list}>
            {questions.map((question) => (
              <article className={styles.card} key={question.id}>
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

                <h2 className={styles.cardTitle}>{question.title}</h2>
                <p className={styles.cardText}>{question.content}</p>

                <div className={styles.tags}>
                  {question.tags.map((item) => (
                    <span className={styles.tag} key={`${question.id}-${item}`}>
                      #{item}
                    </span>
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.voteRow}>
                    <button
                      className={`${styles.voteButton} ${question.hasLiked ? styles.voteButtonActive : ""}`}
                      onClick={() => void handleVote(question.id, "like")}
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
                      onClick={() => void handleVote(question.id, "dislike")}
                      type="button"
                    >
                      <Image alt="Дизлайк" className={styles.voteIcon} src={DislikeIcon} />
                      <span>{question.dislikes}</span>
                    </button>
                  </div>

                  <span className={styles.author}>{question.authorName}</span>
                  <span className={styles.meta}>{question.commentsCount} ответов</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  );
};

export default ForumHub;
