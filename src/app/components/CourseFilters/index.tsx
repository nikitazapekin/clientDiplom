"use client";

import SearchCourses from "../SearchCourses";

import styles from "./index.module.scss";
import type { FiltersProps } from "./types";

const CourseFilters = ({ handleOpen }: FiltersProps) => {
  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <h2 className={styles.courses__title}>Созданные курсы</h2>

          <p className={styles.courses__create} onClick={handleOpen}>
            Создать курс
          </p>
        </div>

        <SearchCourses onSearchChange={() => {}} onSortChange={() => {}} />
      </div>
    </div>
  );
};

export default CourseFilters;
