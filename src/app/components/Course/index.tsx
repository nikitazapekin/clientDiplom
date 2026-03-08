"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "./index.module.scss";
import type { CourseItem } from "./types";

import { AuthService } from "@/app/http/auth";
import { getBaseUrl } from "@/app/http/api";

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

interface CourseProps {
  item: CourseItem["item"];
  isAdmin?: boolean;
}

const Course = ({ item, isAdmin }: CourseProps) => {
  const router = useRouter();
  const imageSrc = getValidImageSrc(item.logo);

  const handleNavigate = () => {
    const userRole = AuthService.getCurrentUser().role;
    const isUserAdmin = isAdmin ?? userRole === "admin";

    if (isUserAdmin) {
      router.push(`/admin/courses/${item.id}`);
    } else {
      router.push(`/study/${item.id}/course`);
    }
  };

  return (
    <div className={styles.course} onClick={handleNavigate}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt="preview"
          className={styles.course__image}
          width={100}
          height={100}
        />
      ) : (
        <div
          className={styles.course__image}
          style={{ width: 100, height: 100, background: "#eee" }}
        />
      )}
      <div className={styles.course__preview}>
        <h3 className={styles.course__title}>{item.title}</h3>
        <p className={styles.course__description}>{item.description}</p>
        <div className={styles.course__lesson}>
          <p className={styles.course__count}>
            <b>Количество уроков:</b> {item.lessonCount}
          </p>
        </div>

        <div className={styles.course__lesson}>
          <p className={styles.course__count}>
            <b>Количество студентов:</b> {12123}
          </p>
        </div>

        <div className={styles.course__tags}>
          {item.tags.map((item, index) => (
            <div key={index} className={styles.course__tag}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Course;
