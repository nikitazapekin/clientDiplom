"use client";

import SearchCourses from "../SearchCourses";

import styles from "./index.module.scss";

const CourseFilters = () => {
  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <h2 className={styles.courses__title}>Созданные курсы</h2>

          <p className={styles.courses__create}>Создать курс</p>
        </div>

        <SearchCourses onSearchChange={() => {}} onSortChange={() => {}} />
      </div>
    </div>
  );
};

export default CourseFilters;
