import AdminCourses from "@/app/components/AdminCourses";
import { CourseService } from "@/app/http/courses";

const Courses = async () => {
  const courses = await CourseService.getCourses();

  return (
    <>
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
