"use client";

import { useMemo, useState } from "react";

import Course from "../Course";
import CourseCategory from "../CourseCategory";
import SearchCourses from "../SearchCourses";

import styles from "./index.module.scss";

const categories = [
  {
    id: 1,
    title: "Языки программирования",
    courses: [
      {
        id: 1,
        title: "JavaScript для новичков",
        logo: "../../../assets/logo/logo.png",
        lessonCount: 32,
        description: "Практичный курс для самых новичков в программировании",
      },
      {
        id: 12,
        title: "Python для начинающих",
        logo: "../../../assets/logo/logo.png",
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
        logo: "../../../assets/logo/logo.png",
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

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("Все");

  const getAllCourses = () => {
    return categories.flatMap((category) =>
      category.courses.map((course) => ({
        ...course,
        categoryTitle: category.title,
      }))
    );
  };

  const filteredCourses = useMemo(() => {
    let courses = getAllCourses();

    if (searchQuery.trim()) {
      courses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortOption !== "Все") {
      switch (sortOption) {
        case "По алфавиту":
          courses.sort((a, b) => a.title.localeCompare(b.title));
          break;

        case "По количеству уроков":
          courses.sort((a, b) => b.lessonCount - a.lessonCount);
          break;

        default:
          break;
      }
    }

    return courses;
  }, [searchQuery, sortOption]);

  const shouldShowCategories = !searchQuery.trim() && sortOption === "Все";

  return (
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
};

export default Courses;
