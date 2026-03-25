"use client";

import { useState } from "react";

import Course from "../Course";
import CourseFilters from "../CourseFilters";

import styles from "./index.module.scss";

import type { CourseListResponse } from "@/app/http/types/course";

const sortOptions = [
  { label: "Сначала новые", value: "recent" },
  { label: "Недавно обновленные", value: "updated" },
  { label: "По названию", value: "alphabet" },
  { label: "По числу тегов", value: "tags" },
];

const Courses = ({ initialCourses }: { initialCourses: CourseListResponse }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState(sortOptions[0].value);

  const courses = (initialCourses?.courses ?? []).map((course) => ({
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

  return (
    <section className={styles.courses}>
      <div className={styles.courses__container}>
        <CourseFilters
          eyebrow="Каталог"
          title="Курсы для обучения"
          description="Быстрый поиск по названию, тегам и технологиям."
          totalCount={filteredCourses.length}
          searchPlaceholder="Поиск по названию, тегам или технологии"
          sortOptions={sortOptions}
          onSearchChange={setSearchQuery}
          onSortChange={setSortOption}
        />

        {filteredCourses.length > 0 ? (
          <div className={styles.courses__grid}>
            {filteredCourses.map((item) => (
              <Course key={item.id} item={item} isAdmin={false} />
            ))}
          </div>
        ) : (
          <div className={styles.courses__empty}>
            <h3 className={styles.courses__emptyTitle}>Курсы не найдены</h3>
            <p className={styles.courses__emptyText}>
              Попробуйте сократить запрос или выбрать другую сортировку.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Courses;
