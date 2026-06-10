import CourseDetails from "@/app/components/CourseDetails";
import { CourseService } from "@/app/http/courses";

export const dynamic = "force-dynamic";

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
