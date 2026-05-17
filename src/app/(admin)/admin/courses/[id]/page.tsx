import CourseDetails from "@/app/components/CourseDetails";
import { CourseService } from "@/app/http/courses";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;

  const course = await CourseService.getCourseById(id);

  return (
    <>
      <CourseDetails course={course} />
    </>
  );
};

export default Page;
