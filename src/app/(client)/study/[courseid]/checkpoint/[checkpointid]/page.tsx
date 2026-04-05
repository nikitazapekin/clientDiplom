import Checkpoint from "@/app/components/Checkpoint";

interface PageProps {
  params: Promise<{
    courseid: string;
    checkpointid: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { courseid, checkpointid } = await params;

  return <Checkpoint courseId={courseid} checkpointId={checkpointid} />;
};

export default Page;
