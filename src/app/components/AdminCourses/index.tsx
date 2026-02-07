"use client";

import { useState } from "react";

import CourseFilters from "../CourseFilters";
import CreateCourseModal from "../CreateCourseModal";

/* 
const categories = [
  {
    id: 1,
    title: "Языки программирования",
    courses: [
      {
        id: 1,
        title: "JavaScript для новичков",
        logo: "../../../assets/courses/JS.png",
        lessonCount: 32,
        description: "Практичный курс для самых новичков в программировании",
      },
      {
        id: 12,
        title: "Python для начинающих",
        logo: "../../../assets/courses/JS.png",
        lessonCount: 28,
        description: "Основы программирования на Python",
      },
    ],
  },
  {
    id: 2,
    title: "Мои курсы",
    courses: [
      {
        id: 3,
        title: "React продвинутый",
        logo: "../../../assets/courses/JS.png",
        lessonCount: 45,
        description: "Продвинутые техники в React",
      },
    ],
  },
  {
    id: 3,
    title: "Алгоритмы и структуры данных",
    courses: [
      {
        id: 4,
        title: "Алгоритмы на JavaScript",
        logo: "../../../assets/logo/logo.png",
        lessonCount: 35,
        description: "Изучение основных алгоритмов",
      },

      {
        id: 5,
        title: "Алгоритмы на JavaScript",
        logo: "../../../assets/logo/logo.png",
        lessonCount: 35,
        description: "Изучение основных алгоритмов",
      },
    ],
  },
];
 */

const AdminCourses = () => {
  const [isOpenCourse, setIsOpenCourse] = useState(false);
  const handleOpen = () => {
    setIsOpenCourse((prev) => !prev);
  };

  return (
    <>
      <CourseFilters handleOpen={handleOpen} />

      <CreateCourseModal handleOpen={handleOpen} isOpen={isOpenCourse} />
    </>
  );
};

export default AdminCourses;
