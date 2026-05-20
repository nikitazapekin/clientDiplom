"use client";

import { useEffect, useMemo, useState } from "react";

import Course from "../Course";
import CourseFilters from "../CourseFilters";

import styles from "./index.module.scss";

import type { CourseFilterValues } from "@/app/components/CourseFilters/types";
import { AuthService } from "@/app/http/auth";
import { CourseService } from "@/app/http/courses";
import type { CourseListResponse, CourseStatsResponse } from "@/app/http/types/course";

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

const Courses = ({ initialCourses }: { initialCourses: CourseListResponse }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState(sortOptions[0].value);
  const [filters, setFilters] = useState<CourseFilterValues>(DEFAULT_FILTERS);
  const [courseStats, setCourseStats] = useState<Record<string, CourseStatsResponse | undefined>>({});
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isActive = true;

    const loadSubscribedCourses = async () => {
      const { accessToken, role } = AuthService.getCurrentUser();

      if (!accessToken || role !== "client") {
        if (isActive) {
          setSubscribedCourseIds(new Set());
        }

        return;
      }

      try {
        const subscribedCourses = await CourseService.getMyCourses();

        if (isActive) {
          setSubscribedCourseIds(new Set(subscribedCourses.map((course) => course.id)));
        }
      } catch (error) {
        console.error("Failed to load subscribed courses:", error);

        if (isActive) {
          setSubscribedCourseIds(new Set());
        }
      }
    };

    void loadSubscribedCourses();

    return () => {
      isActive = false;
    };
  }, []);

  const courses = useMemo(
    () =>
      (initialCourses?.courses ?? []).map((course) => ({
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
        isSubscribed: subscribedCourseIds.has(course.id),
      })),
    [initialCourses?.courses, subscribedCourseIds],
  );

  useEffect(() => {
    let isActive = true;

    const loadCourseStats = async () => {
      const statsEntries = await Promise.all(
        courses.map(async (course) => {
          try {
            const stats = await CourseService.getCourseStats(course.id);

            return [course.id, stats] as const;
          } catch (error) {
            console.error(`Failed to load stats for course ${course.id}:`, error);

            return [course.id, undefined] as const;
          }
        }),
      );

      if (isActive) {
        setCourseStats(Object.fromEntries(statsEntries));
      }
    };

    void loadCourseStats();

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
  const filteredCourses = courses
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

      const createdDate = new Date(course.createdAt);

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
          title="Курсы для обучения"
          description="Быстрый поиск по названию, тегам и технологиям."
          filters={filters}
          onApplyFilters={setFilters}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
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
              Попробуйте изменить запрос, ослабить фильтры или выбрать другую сортировку.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Courses;
