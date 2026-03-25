"use client";

import { useState } from "react";

import Course from "../Course";
import CourseFilters from "../CourseFilters";
import CreateCourseModal from "../CreateCourseModal";

import styles from "./index.module.scss";
import type { CourseListResponse } from "./types";

const sortOptions = [
  { label: "Сначала новые", value: "recent" },
  { label: "Недавно обновленные", value: "updated" },
  { label: "По названию", value: "alphabet" },
  { label: "По числу тегов", value: "tags" },
];

const AdminCourses = ({ initialCourses }: CourseListResponse) => {
  const [isOpenCourse, setIsOpenCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState(sortOptions[0].value);

  const handleOpen = () => {
    setIsOpenCourse((prev) => !prev);
  };

  const courses = initialCourses.courses.map((course) => ({
    id: course.id,
    title: course.title,
    logo: course.logo,
    description: course.description,
    tags: course.tags,
    type: course.type,
    language: course.language,
    status: course.status,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  }));

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCourses = courses
    .filter((course) => {
      if (!normalizedQuery) return true;

      const searchableContent = [
        course.title,
        course.description,
        course.type,
        course.language,
        ...course.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchableContent.includes(normalizedQuery);
    })
    .sort((first, second) => {
      if (sortOption === "alphabet") {
        return first.title.localeCompare(second.title, "ru");
      }

      if (sortOption === "updated") {
        return new Date(second.updatedAt ?? 0).getTime() - new Date(first.updatedAt ?? 0).getTime();
      }

      if (sortOption === "tags") {
        return second.tags.length - first.tags.length;
      }

      return new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime();
    });

  const publishedCount = courses.filter((course) => course.status === "published").length;
  const draftCount = courses.filter((course) => course.status === "draft").length;
  const archivedCount = courses.filter((course) => course.status === "archived").length;
  const uniqueTagsCount = new Set(courses.flatMap((course) => course.tags)).size;

  return (
    <section className={styles.courses}>
      <div className={styles.courses__container}>
        <header className={styles.courses__hero}>
          <div className={styles.courses__heroCopy}>
            <p className={styles.courses__eyebrow}>Курсы</p>
            <h1 className={styles.courses__title}>Управление учебными курсами</h1>
            <p className={styles.courses__description}>
              Здесь можно быстро найти нужный курс, посмотреть его состояние и перейти к
              редактированию.
            </p>
          </div>

          <div className={styles.courses__stats}>
            <div className={styles.courses__statCard}>
              <span className={styles.courses__statLabel}>Всего</span>
              <strong className={styles.courses__statValue}>{initialCourses.total}</strong>
              <p className={styles.courses__statDescription}>Курсов в системе</p>
            </div>

            <div className={styles.courses__statCard}>
              <span className={styles.courses__statLabel}>Опубликовано</span>
              <strong className={styles.courses__statValue}>{publishedCount}</strong>
              <p className={styles.courses__statDescription}>Доступны студентам</p>
            </div>

            <div className={styles.courses__statCard}>
              <span className={styles.courses__statLabel}>Черновики</span>
              <strong className={styles.courses__statValue}>{draftCount + archivedCount}</strong>
              <p className={styles.courses__statDescription}>
                {draftCount} черновиков, {archivedCount} в архиве
              </p>
            </div>

            <div className={styles.courses__statCard}>
              <span className={styles.courses__statLabel}>Теги</span>
              <strong className={styles.courses__statValue}>{uniqueTagsCount}</strong>
              <p className={styles.courses__statDescription}>Направления и темы</p>
            </div>
          </div>
        </header>

        <CourseFilters
          eyebrow="Каталог"
          title="Созданные курсы"
          description="Поиск работает по названию, описанию, языку и тегам."
          handleOpen={handleOpen}
          ctaLabel="Создать курс"
          showCreateButton={true}
          totalCount={filteredCourses.length}
          searchPlaceholder="Найти курс по названию, стеку или тегу"
          sortOptions={sortOptions}
          onSearchChange={setSearchQuery}
          onSortChange={setSortOption}
        />

        {filteredCourses.length > 0 ? (
          <div className={styles.courses__grid}>
            {filteredCourses.map((item) => (
              <Course key={item.id} item={item} isAdmin={true} />
            ))}
          </div>
        ) : (
          <div className={styles.courses__empty}>
            <h3 className={styles.courses__emptyTitle}>По этому запросу курсы не найдены</h3>
            <p className={styles.courses__emptyText}>
              Попробуйте изменить формулировку, убрать часть тегов или сбросить сортировку.
            </p>
          </div>
        )}

        <CreateCourseModal handleOpen={handleOpen} isOpen={isOpenCourse} />
      </div>
    </section>
  );
};

export default AdminCourses;
