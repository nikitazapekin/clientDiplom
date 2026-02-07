import Image from "next/image";

import Logo from "../../../assets/courses/JS.png";

import styles from "./index.module.scss";
import type { CourseItem } from "./types";

const Course = ({ item }: CourseItem) => {
  return (
    <div className={styles.course}>
      <Image src={Logo} alt="preview" className={styles.course__image} />
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
          <div className={styles.course__tag}>JS</div>
          <div className={styles.course__tag}>Основы</div>
          <div className={styles.course__tag}>Алгоритмы</div>
        </div>
      </div>
    </div>
  );
};

export default Course;
