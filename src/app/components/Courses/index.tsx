"use client";

import { useState } from "react";

import Course from "../Course";
import CourseFilters from "../CourseFilters";

import styles from "./index.module.scss";

import type { CourseListResponse } from "@/app/http/types/course";

const Courses = ({ initialCourses }: { initialCourses: CourseListResponse }) => {
  console.log("INIT", initialCourses);

  const [isOpenCourse, setIsOpenCourse] = useState(false);

  console.log(isOpenCourse);
  const handleOpen = () => {
    setIsOpenCourse((prev) => !prev);
  };

  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <CourseFilters handleOpen={handleOpen} />

        <p>hello</p>

        {(initialCourses?.courses ?? []).map((itemm) => {
          const item = {
            id: itemm.id,
            title: itemm.title,
            logo: itemm.logo,
            lessonCount: 0,
            description: itemm.description,
            tags: itemm.tags,
          };

          return <Course key={item.id} item={item} />;
        })}
      </div>
    </div>
  );
  /*   return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <h1 className={styles.courses__title}>Выберите курс для обучения</h1>
        </div>
        <SearchCourses onSearchChange={setSearchQuery} onSortChange={setSortOption} />

        {shouldShowCategories ? (
          categories.map((category) => (
            <CourseCategory title={category.title} courses={category.courses} key={category.id} />
          ))
        ) : (
          <div className={styles.courses__list}>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => <Course item={course} key={course.id} />)
            ) : (
              <div className={styles.courses__empty}>
                <p>Курсы не найдены</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; */
};

export default Courses;
