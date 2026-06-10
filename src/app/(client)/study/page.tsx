import Courses from "@/app/components/Courses";
import { CourseService } from "@/app/http/courses";
import type { CourseListResponse } from "@/app/http/types/course";

export const dynamic = "force-dynamic";

const emptyCourses: CourseListResponse = {
  courses: [],
  total: 0,
  page: 1,
  pages: 0,
};

const Study = async () => {
  let courses = emptyCourses;

  try {
    courses = await CourseService.getCourses();
  } catch (error) {
    console.error("Failed to load courses:", error);
  }

  return (
    <>
      <Courses initialCourses={courses} />
    </>
  );
};

export default Study;
 