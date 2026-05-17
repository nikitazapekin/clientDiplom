import StudyMap from "@/app/components/StudyMap";
import { CourseService } from "@/app/http/courses";

interface PageProps {
  params: Promise<{
    courseid: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { courseid } = await params;
  const course = await CourseService.getCourseById(courseid);

  return <StudyMap courseId={courseid} courseName={course.title} />;
};

export default Page;
