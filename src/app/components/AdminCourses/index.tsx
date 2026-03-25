"use client";

import { useState } from "react";

import Course from "../Course";
import CourseFilters from "../CourseFilters";
import CreateCourseModal from "../CreateCourseModal";

import styles from "./index.module.scss";
import type { CourseListResponse } from "./types";

const AdminCourses = ({ initialCourses }: CourseListResponse) => {
  const [isOpenCourse, setIsOpenCourse] = useState(false);
  const handleOpen = () => {
    setIsOpenCourse((prev) => !prev);
  };

  return (
    <>
      <div className={styles.courses}>
        <div className={styles.courses__container}>
          <CourseFilters handleOpen={handleOpen} />

          {initialCourses.courses.map((itemm) => {
            const item = {
              id: itemm.id,
              title: itemm.title,
              logo: itemm.logo,
              description: itemm.description,
              tags: itemm.tags,
            };

            return <Course key={item.id} item={item} isAdmin={true} />;
          })}

          <CreateCourseModal handleOpen={handleOpen} isOpen={isOpenCourse} />
        </div>
      </div>
    </>
  );
};

export default AdminCourses;
