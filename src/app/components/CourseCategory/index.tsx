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
        </div>
      </div>
    </section>
  );
};

export default CourseCategory;
