"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "./index.module.scss";
import type { CourseItem } from "./types";

const Course = ({ item }: CourseItem) => {
  const router = useRouter();

  const handleNavigate = () => {
    router.push(`/admin/courses/${item.id}`);
  };

  return (
    <div className={styles.course} onClick={handleNavigate}>
      <Image
        src={item.logo}
        alt="preview"
        className={styles.course__image}
        width={100}
        height={100}
      />
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
