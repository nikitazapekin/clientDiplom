"use client";

import { type KeyboardEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "./index.module.scss";
import type { CourseItem } from "./types";

import { getBaseUrl } from "@/app/http/api";
import { AuthService } from "@/app/http/auth";
import { CourseService } from "@/app/http/courses";
import type { CourseStatsResponse, CourseStatus } from "@/app/http/types/course";

const getValidImageSrc = (logo: string): string | null => {
  if (!logo || typeof logo !== "string" || !logo.trim()) return null;

  const trimmed = logo.trim();

  if (trimmed.startsWith("data:")) return trimmed;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  if (trimmed.startsWith("/")) return `${getBaseUrl()}${trimmed}`;

  try {
    new URL(trimmed);

    return trimmed;
  } catch {
    return null;
  }
};

const statusLabels: Record<CourseStatus, string> = {
  draft: "Черновик",
  published: "Опубликован",
  archived: "Архив",
};

interface CourseProps {
  item: CourseItem["item"];
  isAdmin?: boolean;
}

const Course = ({ item, isAdmin }: CourseProps) => {
  const router = useRouter();
  const imageSrc = getValidImageSrc(item.logo);
  const [stats, setStats] = useState<CourseStatsResponse | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadCourseStats = async () => {
      try {
        const courseStats = await CourseService.getCourseStats(item.id);

        if (isActive) {
          setStats(courseStats);
        }
      } catch (error) {
        console.error("Failed to load course stats:", error);

        if (isActive) {
          setStats({
            lessonCount: item.lessonCount ?? 0,
            studentCount: 0,
          });
        }
      }
    };

    setStats(null);
    void loadCourseStats();

    return () => {
      isActive = false;
    };
  }, [item.id, item.lessonCount]);

  const handleNavigate = () => {
    const userRole = AuthService.getCurrentUser().role;
    const isUserAdmin = isAdmin ?? userRole === "admin";

    if (isUserAdmin) {
      router.push(`/admin/courses/${item.id}`);
    } else {
      router.push(`/study/${item.id}/course`);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigate();
    }
  };

  const visibleTags = item.tags.slice(0, 2);
  const hiddenTagsCount = Math.max(item.tags.length - visibleTags.length, 0);
  const courseInitial = item.title.trim().charAt(0).toUpperCase() || "C";
  const statusLabel = isAdmin && item.status ? statusLabels[item.status] : null;
  const subscriptionLabel = !isAdmin && item.isSubscribed ? "Вы подписаны" : null;

  return (
    <article
      className={styles.course}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className={styles.course__media}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={item.title}
            className={styles.course__image}
            fill
            sizes="(max-width: 767px) 100vw, 30vw"
          />
        ) : (
          <div className={styles.course__fallback}>
            <span className={styles.course__initial}>{courseInitial}</span>
          </div>
        )}
      </div>

      <div className={styles.course__body}>
        <div className={styles.course__head}>
          <div className={styles.course__main}>
            <div className={styles.course__meta}>
              {subscriptionLabel ? (
                <span className={`${styles.course__badge} ${styles.course__badgeSubscribed}`}>
                  {subscriptionLabel}
                </span>
              ) : null}
              {item.type ? <span className={styles.course__badge}>{item.type}</span> : null}
              {item.language ? <span className={styles.course__badge}>{item.language}</span> : null}
              {statusLabel ? <span className={styles.course__badge}>{statusLabel}</span> : null}
            </div>

            <h3 className={styles.course__title}>{item.title}</h3>
          </div>
 
        </div>

        <p className={styles.course__description}>
          {item.description || "Описание курса пока не заполнено."}
        </p>

        <div className={styles.course__stats}>
          <div className={styles.course__stat}>
            <span className={styles.course__statLabel}>Уроков</span>
            <strong className={styles.course__statValue}>{stats?.lessonCount ?? "..."}</strong>
          </div>

          <div className={styles.course__stat}>
            <span className={styles.course__statLabel}>Студентов</span>
            <strong className={styles.course__statValue}>{stats?.studentCount ?? "..."}</strong>
          </div>
        </div>

        <div className={styles.course__tags}>
          {visibleTags.map((tag, index) => (
            <span key={`${tag}-${index}`} className={styles.course__tag}>
              #{tag}
            </span>
          ))}

          {hiddenTagsCount > 0 ? (
            <span className={styles.course__tag}>+{hiddenTagsCount}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default Course;
