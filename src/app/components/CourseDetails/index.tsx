"use client";

import Certificate from "@assets/courses/Certificate.png";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "../Button";

import styles from "./index.module.scss";
import type { CourseResponse } from "./types";

import { AuthService } from "@/app/http/auth";
import { CourseService } from "@/app/http/courses";

const CourseDetails = ({ course }: CourseResponse) => {
  const router = useRouter();
  const detailedDescription = course.fullDescription?.trim() || course.description;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lessonCount, setLessonCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  const userRole = AuthService.getCurrentUser().role;
  const isAdmin = userRole === "admin";

  const loadCourseMeta = useCallback(async () => {
    setSubscriptionLoading(true);

    try {
      const [stats, subscribed] = await Promise.all([
        CourseService.getCourseStats(course.id),
        isAdmin ? Promise.resolve(false) : CourseService.checkSubscription(course.id),
      ]);

      setLessonCount(stats.lessonCount ?? 0);
      setStudentCount(stats.studentCount ?? 0);
      setIsSubscribed(subscribed);
    } catch (loadError) {
      console.error("Failed to load course meta:", loadError);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [course.id, isAdmin]);

  useEffect(() => {
    void loadCourseMeta();
  }, [loadCourseMeta]);

  const handleRedirect = () => {
    if (isUserAdmin) {
      router.push(`/admin/courses/${course.id}/map`);

      return;
    }

    router.push(`/study/${course.id}/map`);
  };

  const isUserAdmin = userRole === "admin";

  const handleSubscribe = async () => {
    setActionLoading(true);

    try {
      await CourseService.subscribe(course.id);
      setIsSubscribed(true);
    } catch (subscribeError) {
      console.error(subscribeError);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setActionLoading(true);

    try {
      await CourseService.unsubscribe(course.id);
      setIsSubscribed(false);
    } catch (unsubscribeError) {
      console.error(unsubscribeError);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <div className={styles.courses__imageWrapper}>
            <Image
              src={course.logo}
              alt="Logo"
              className={styles.courses__image}
              width={220}
              height={220}
            />
          </div>
          <div className={styles.courses__info}>
            <div className={styles.courses__infoPreview}>
              <h1 className={styles.courses__title}>{course.title}</h1>
              {isAdmin && <p className={styles.courses__edit}>Редактировать</p>}
              {!isAdmin && isSubscribed ? (
                <span className={styles.courses__subscribedBadge}>Вы подписаны</span>
              ) : null}
            </div>

            <h2 className={styles.courses__description}>{course.description}</h2>

            <div className={styles.courses__meta}>
              <div className={styles.courses__stat}>
                <div className={styles.courses__iconBox}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                </div>
                <span>{lessonCount} уроков</span>
              </div>
              <div className={styles.courses__stat}>
                <div className={styles.courses__iconBox}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                <span>{studentCount} студентов</span>
              </div>
            </div>

            <ul className={styles.courses__tags}>
              {course.tags.map((item, index) => (
                <li className={styles.courses__tag} key={index}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.courses__cubes}>
            <div className={styles.courses__cubesWrapper}>
              <div className={`${styles.courses__cube} ${styles.courses__cube1}`} />
              <div className={`${styles.courses__cube} ${styles.courses__cube2}`} />
            </div>
          </div>
        </div>

        <div className={styles.course__details}>
          <h2 className={styles.course__subtitle}>О курсе</h2>

          <p className={styles.course__detailedDescription}>{detailedDescription}</p>
        </div>

        <div className={styles.courses__certificate}>
          <h3 className={styles.courses__certificateTitle}>
            Сертификат о успешном прохождении курса
          </h3>
          <Image
            src={Certificate}
            alt={"Certificate"}
            className={styles.courses__certificateImage}
          />
        </div>

        <div className={styles.courses__actions}>
          {!isAdmin ? (
            isSubscribed ? (
              <Button
                text={actionLoading ? "Отписка..." : "Отписаться от курса"}
                onClick={() => void handleUnsubscribe()}
                width="313px"
                color="#d8d8d8"
                textColor="#000"
                disabled={actionLoading || subscriptionLoading}
              />
            ) : (
              <Button
                text={actionLoading ? "Подписка..." : "Подписаться на курс"}
                onClick={() => void handleSubscribe()}
                width="313px"
                color="#9F0FA7"
                textColor="#fff"
                disabled={actionLoading || subscriptionLoading}
              />
            )
          ) : null}

          <Button
            text={isAdmin ? "Просмотреть карту курса" : "Начать изучение курса"}
            onClick={handleRedirect}
            width="313px"
            color="#9F0FA7"
            textColor="#fff"
            disabled={!isAdmin && !isSubscribed}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
