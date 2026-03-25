import Courses from "@/app/components/Courses";
import { CourseService } from "@/app/http/courses";

const Study = async () => {
  console.log("STUDYYYYYYYYY");
  const courses = await CourseService.getCourses();

  return (
    <>
      <Courses initialCourses={courses} />
    </>
  );
};

export default Study;

/*
 const courses = await CourseService.getCourses();
 

  return (
    <>
    
      <AdminCourses initialCourses={courses} />
      */
