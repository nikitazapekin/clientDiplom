"use client";

import { useEffect, useState } from "react";
import DislikeIcon from "@assets/icons/utils/dislike.png";
import Image from "next/image";

import styles from "../CommunityHub/index.module.scss";

import articlesService from "@/app/http/articles";
import type { Article } from "@/app/http/types/community";

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

const ArticlesHub = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadArticles = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await articlesService.getArticles({
        limit: 50,
        page: 1,
        search: search.trim() || undefined,
        tag: tag.trim() || undefined,
      });

      setArticles(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить статьи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        setError(null);
        setLoading(true);

        const response = await articlesService.getArticles({
          limit: 50,
          page: 1,
        });

        setArticles(response.items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить статьи");
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

  const handleCreateArticle = async () => {
    if (!title.trim() || !content.trim()) {
      setFormError("Заполни название и текст статьи.");

      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await articlesService.createArticle({
        title: title.trim(),
        tags: parseTags(tagsInput),
        contentBlocks: [
          {
            type: "text",
            data: { text: content.trim() },
          },
        ],
      });

      resetForm();
      setIsComposerOpen(false);
      await loadArticles();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "Не удалось создать статью");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (articleId: string, mode: "like" | "dislike") => {
    try {
      const updated =
        mode === "like"
          ? await articlesService.toggleLike(articleId)
          : await articlesService.toggleDislike(articleId);

      setArticles((current) =>
        current.map((article) => (article.id === articleId ? { ...article, ...updated } : article)),
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
         
            <h1 className={styles.title}>Публикации студентов и разборы решений</h1>
            <p className={styles.lead}>
              Собирай заметки по задачам, делись находками и поднимай полезные материалы реакциями.
            </p>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                onClick={() => setIsComposerOpen((current) => !current)}
                type="button"
              >
                {isComposerOpen ? "Скрыть форму" : "Новая статья"}
              </button>
            </div>
          </div>
        </section>

        {isComposerOpen && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Опубликовать статью</h2>
                <p className={styles.panelText}>Минимальный сценарий как в мобильной версии: заголовок, теги и текст.</p>
              </div>
            </div>

            <div className={styles.fields}>
              <input
                className={styles.input}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Название статьи"
                value={title}
              />
              <input
                className={styles.input}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="Теги через запятую: react, алгоритмы, sql"
                value={tagsInput}
              />
              <textarea
                className={styles.textarea}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Текст статьи"
                value={content}
              />
              <p className={styles.hint}>После публикации статья сразу появится в общем списке.</p>
              {formError ? <p className={styles.error}>{formError}</p> : null}
              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  disabled={submitting}
                  onClick={() => void handleCreateArticle()}
                  type="button"
                >
                  {submitting ? "Публикую..." : "Опубликовать"}
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
              <p className={styles.panelText}>Ищи по названию или быстро сужай список по тегу.</p>
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
            <div className={styles.formActions}>
              <button className={styles.secondaryButton} onClick={() => void loadArticles()} type="button">
                Найти статьи
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <section className={styles.state}>
            <p className={styles.message}>Загружаю статьи...</p>
          </section>
        ) : error ? (
          <section className={styles.state}>
            <p className={styles.error}>{error}</p>
            <div className={styles.formActions}>
              <button className={styles.secondaryButton} onClick={() => void loadArticles()} type="button">
                Повторить
              </button>
            </div>
          </section>
        ) : articles.length === 0 ? (
          <section className={styles.state}>
            <p className={styles.message}>Статей пока нет. Можно опубликовать первую.</p>
          </section>
        ) : (
          <section className={styles.list}>
            {articles.map((article) => (
              <article className={styles.card} key={article.id}>
                <div className={styles.cardTop}>
                  <span className={styles.cardDate}>{formatDate(article.createdAt)}</span>
                  <span className={styles.cardBadge}>
                    {article.likes - article.dislikes >= 0 ? "+" : ""}
                    {article.likes - article.dislikes}
                  </span>
                </div>

                <h2 className={styles.cardTitle}>{article.title}</h2>
                <p className={styles.cardText}>{article.excerpt}</p>

                <div className={styles.tags}>
                  {article.tags.map((item) => (
                    <span className={styles.tag} key={`${article.id}-${item}`}>
                      #{item}
                    </span>
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.voteRow}>
                    <button
                      className={`${styles.voteButton} ${article.hasLiked ? styles.voteButtonActive : ""}`}
                      onClick={() => void handleVote(article.id, "like")}
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
                      onClick={() => void handleVote(article.id, "dislike")}
                      type="button"
                    >
                      <Image alt="Дизлайк" className={styles.voteIcon} src={DislikeIcon} />
                      <span>{article.dislikes}</span>
                    </button>
                  </div>

                  <span className={styles.author}>{article.authorName}</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  );
};

export default ArticlesHub;
