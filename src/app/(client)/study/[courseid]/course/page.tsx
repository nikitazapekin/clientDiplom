import CourseDetails from "@/app/components/CourseDetails";
import { CourseService } from "@/app/http/courses";

interface PageProps {
  params: Promise<{
    courseid: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { courseid } = await params;

  const course = await CourseService.getCourseById(courseid);

  return <CourseDetails course={course} />;
};

export default Page;
