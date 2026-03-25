"use client";

import SearchCourses from "../SearchCourses";

import styles from "./index.module.scss";
import type { FiltersProps } from "./types";

const CourseFilters = ({
  handleOpen,
  title,
  description,
  eyebrow,
  ctaLabel = "Создать курс",
  showCreateButton = false,
  totalCount,
  searchPlaceholder,
  sortOptions,
  onSearchChange,
  onSortChange,
}: FiltersProps) => {
  return (
    <section className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <div className={styles.courses__copy}>
            {eyebrow ? <p className={styles.courses__eyebrow}>{eyebrow}</p> : null}
            <h2 className={styles.courses__title}>{title}</h2>
            <p className={styles.courses__description}>{description}</p>
          </div>

          <div className={styles.courses__actions}>
            {typeof totalCount === "number" ? (
              <div className={styles.courses__count}>
                <span className={styles.courses__countLabel}>Найдено</span>
                <strong className={styles.courses__countValue}>{totalCount}</strong>
              </div>
            ) : null}

            {showCreateButton && handleOpen ? (
              <button className={styles.courses__create} type="button" onClick={handleOpen}>
                {ctaLabel}
              </button>
            ) : null}
          </div>
        </div>

        <SearchCourses
          onSearchChange={onSearchChange}
          onSortChange={onSortChange}
          placeholder={searchPlaceholder}
          sortOptions={sortOptions}
        />
      </div>
    </section>
  );
};

export default CourseFilters;
