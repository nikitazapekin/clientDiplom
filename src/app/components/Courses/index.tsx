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
        description: "Практичный курс для самых новичком в пронраммировании",
      },
      {
        id: 12,
        title: "JavaScript для новичков",
        logo: "../../../assets/logo/logo.png",
        lessonCount: 32,
        description: "Практичный курс для самых новичком в пронраммировании",
      },
    ],
  },
  { id: 2, title: "Мои курсы", courses: [] },
  { id: 3, title: "Алгоритмы и структуры данных", courses: [] },
];
const Courses = () => {
  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <h1 className={styles.courses__title}>Выберите курс для обучения</h1>
        </div>
        <SearchCourses />
        {/*     {Array.from({length: 100}).map(item=> (
          <div>test</div>
        ))} */}
        {categories.map((item) => (
          <CourseCategory title={item.title} courses={item.courses} key={item.id} />
        ))}
      </div>
    </div>
  );
};

export default Courses;
/*
  id: number, 
  title: string, 
  logo: string, 
  lessonCount: number, 
  description: string, 
  */
