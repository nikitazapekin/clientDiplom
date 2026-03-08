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

        {(initialCourses?.courses ?? []).map((itemm) => {
          const item = {
            id: itemm.id,
            title: itemm.title,
            logo: itemm.logo,
            lessonCount: 0,
            description: itemm.description,
            tags: itemm.tags,
          };

          return <Course key={item.id} item={item} isAdmin={false} />;
        })}
      </div>
    </div>
  );

};

export default Courses;
