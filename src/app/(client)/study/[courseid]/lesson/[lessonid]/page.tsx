import StudyLesson from "@/app/components/StudyLesson";

interface PageProps {
  params: Promise<{
    courseid: string;
    lessonid: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { courseid, lessonid } = await params;

  return <StudyLesson courseId={courseid} lessonId={lessonid} />;
};

export default Page;
