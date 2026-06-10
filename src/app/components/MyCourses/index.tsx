"use client";

import { useEffect, useMemo, useState } from "react";

import Course from "../Course";
import CourseFilters from "../CourseFilters";

import styles from "./index.module.scss";

import type { CourseFilterValues } from "@/app/components/CourseFilters/types";
import { CourseService } from "@/app/http/courses";
import type { CourseStatsResponse, StudentCourseResponse } from "@/app/http/types/course";

const sortOptions = [
  { label: "Сначала новые", value: "recent" },
  { label: "Недавно обновленные", value: "updated" },
  { label: "По названию", value: "alphabet" },
  { label: "По числу тегов", value: "tags" },
];

const DEFAULT_FILTERS: CourseFilterValues = {
  createdFrom: "",
  createdTo: "",
  hashtags: "",
  keywords: "",
  maxLessons: "",
  maxStudents: "",
  minLessons: "",
  minStudents: "",
};

const normalizeValue = (value: string) => value.trim().toLowerCase();
const normalizeDateValue = (value: string) => value.trim();

const parseNumberFilter = (value: string) => {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateFilter = (value: string) => {
  const normalized = normalizeDateValue(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const splitFilterTerms = (value: string) =>
  value
    .split(",")
    .map((item) => normalizeValue(item))
    .filter(Boolean);

const MyCourses = () => {
  const [courses, setCourses] = useState<StudentCourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState(sortOptions[0].value);
  const [filters, setFilters] = useState<CourseFilterValues>(DEFAULT_FILTERS);
  const [courseStats, setCourseStats] = useState<Record<string, CourseStatsResponse | undefined>>({});

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await CourseService.getMyCourses();

        if (isActive) {
          setCourses(data);
        }
      } catch {
        if (isActive) {
          setError("Не удалось загрузить ваши курсы");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadCourseStats = async () => {
      const statsEntries = await Promise.all(
        courses.map(async (course) => {
          try {
            const stats = await CourseService.getCourseStats(course.id);

            return [course.id, stats] as const;
          } catch (loadStatsError) {
            console.error(`Failed to load stats for course ${course.id}:`, loadStatsError);

            return [course.id, undefined] as const;
          }
        }),
      );

      if (isActive) {
        setCourseStats(Object.fromEntries(statsEntries));
      }
    };

    if (courses.length > 0) {
      void loadCourseStats();
    } else {
      setCourseStats({});
    }

    return () => {
      isActive = false;
    };
  }, [courses]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const keywordTerms = splitFilterTerms(filters.keywords);
  const hashtagTerms = splitFilterTerms(filters.hashtags);
  const minLessons = parseNumberFilter(filters.minLessons);
  const maxLessons = parseNumberFilter(filters.maxLessons);
  const minStudents = parseNumberFilter(filters.minStudents);
  const maxStudents = parseNumberFilter(filters.maxStudents);
  const createdFrom = parseDateFilter(filters.createdFrom);
  const createdTo = parseDateFilter(filters.createdTo);

  const filteredCourses = useMemo(
    () =>
      courses
        .filter((course) => {
          const searchableContent = [
            course.title,
            course.description,
            course.type,
            course.language,
            ...course.tags,
          ]
            .join(" ")
            .toLowerCase();

          if (normalizedQuery && !searchableContent.includes(normalizedQuery)) {
            return false;
          }

          const keywordHaystack = [
            course.title,
            course.description,
            course.language,
            course.type,
          ]
            .join(" ")
            .toLowerCase();

          if (keywordTerms.length > 0 && !keywordTerms.every((term) => keywordHaystack.includes(term))) {
            return false;
          }

          const normalizedTags = (course.tags ?? []).map((tag) => normalizeValue(tag));

          if (hashtagTerms.length > 0 && !hashtagTerms.every((term) => normalizedTags.includes(term))) {
            return false;
          }

          const stats = courseStats[course.id];

          if (minLessons !== null && (stats?.lessonCount ?? -1) < minLessons) {
            return false;
          }

          if (maxLessons !== null && (stats?.lessonCount ?? Number.POSITIVE_INFINITY) > maxLessons) {
            return false;
          }

          if (minStudents !== null && (stats?.studentCount ?? -1) < minStudents) {
            return false;
          }

          if (maxStudents !== null && (stats?.studentCount ?? Number.POSITIVE_INFINITY) > maxStudents) {
            return false;
          }

          const createdDate = new Date(course.subscribedAt);

          if (createdFrom && createdDate < createdFrom) {
            return false;
          }

          if (createdTo) {
            const createdToEnd = new Date(createdTo);

            createdToEnd.setHours(23, 59, 59, 999);

            if (createdDate > createdToEnd) {
              return false;
            }
          }

          return true;
        })
        .sort((first, second) => {
          if (sortOption === "alphabet") {
            return first.title.localeCompare(second.title, "ru");
          }

          if (sortOption === "updated") {
            return (
              new Date(second.publishedAt ?? second.subscribedAt ?? 0).getTime() -
              new Date(first.publishedAt ?? first.subscribedAt ?? 0).getTime()
            );
          }

          if (sortOption === "tags") {
            return second.tags.length - first.tags.length;
          }

          return (
            new Date(second.subscribedAt ?? 0).getTime() - new Date(first.subscribedAt ?? 0).getTime()
          );
        }),
    [
      courses,
      courseStats,
      createdFrom,
      createdTo,
      hashtagTerms,
      keywordTerms,
      maxLessons,
      maxStudents,
      minLessons,
      minStudents,
      normalizedQuery,
      sortOption,
    ],
  );

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.loader} />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <CourseFilters
          description="Быстрый поиск по названию, тегам и технологиям среди ваших курсов."
          filters={filters}
          onApplyFilters={setFilters}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
          onSearchChange={setSearchQuery}
          onSortChange={setSortOption}
          searchPlaceholder="Поиск по названию, тегам или технологии"
          sortOptions={sortOptions}
          title="Мои курсы"
          totalCount={filteredCourses.length}
        />

        {filteredCourses.length > 0 ? (
          <div className={styles.grid}>
            {filteredCourses.map((course) => (
              <Course
                isAdmin={false}
                item={{
                  id: course.id,
                  title: course.title,
                  logo: course.logo,
                  tags: course.tags,
                  description: course.description,
                  type: course.type,
                  language: course.language,
                  status: course.status,
                  isSubscribed: course.isSubscribed,
                }}
                key={course.id}
              />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>Курсы не найдены</h3>
            <p className={styles.emptyText}>
              Попробуйте изменить запрос, ослабить фильтры или выбрать другую сортировку.
            </p>
          </div>
        ) : (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>Вы еще не записаны на курсы</h3>
            <p className={styles.emptyText}>
              Перейдите в раздел &quot;Учиться&quot;, чтобы найти подходящий курс и начать обучение.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MyCourses;
