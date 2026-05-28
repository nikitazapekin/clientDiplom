"use client";

import { useEffect, useState } from "react";

import Course from "../Course";
import { CourseService } from "@/app/http/courses";
import type { StudentCourseResponse } from "@/app/http/types/course";

import styles from "./index.module.scss";

const MyCourses = () => {
  const [courses, setCourses] = useState<StudentCourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await CourseService.getMyCourses();
        if (isActive) setCourses(data);
      } catch {
        if (isActive) setError("Не удалось загрузить ваши курсы");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();

    return () => { isActive = false; };
  }, []);

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
        <h1 className={styles.title}>Мои курсы</h1>

        {courses.length > 0 ? (
          <div className={styles.grid}>
            {courses.map((course) => (
              <Course
                key={course.id}
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
                isAdmin={false}
              />
            ))}
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
