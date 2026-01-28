import Course from "@components/Course";

import styles from "./index.module.scss";
import type { CourseCategoryProps } from "./types";

const CourseCategory = ({ title, courses }: CourseCategoryProps) => {
  return (
    <section className={styles.category}>
      <div className={styles.category__container}>
        <h2 className={styles.category__title}>{title}</h2>

        <div className={styles.category__courses}>
          {courses.map((item) => (
            <Course key={item.id} item={item} />
          ))}
          {courses.length == 0 && (
            <p className={styles.category__empty}>Курсов пока нету в этой категории</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CourseCategory;
