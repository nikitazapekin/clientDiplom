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