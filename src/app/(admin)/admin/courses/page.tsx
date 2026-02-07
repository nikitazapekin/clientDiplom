import AdminCourses from "@/app/components/AdminCourses";
import { CourseService } from "@/app/http/courses";

const Courses = async () => {
  // Загружаем данные на сервере
  const courses = await CourseService.getCourses();

  // Логируем в серверной консоли (не в браузере)
  console.log("Courses data loaded:", courses);

  return (
    <>
      {/* Передаем данные как пропс */}
      <AdminCourses initialCourses={courses} />
    </>
  );
};

export default Courses;
/* import AdminCourses from "@/app/components/AdminCourses";

const Courses = () => {
  return (
    <>
      <AdminCourses />
    </>
  );
};

export default Courses;
 */

/*
  useEffect(()=> {
const get = async () => {
const res = await CourseService.getCourses()
console.log("res", res)
}
get() 
}, [])
*/
