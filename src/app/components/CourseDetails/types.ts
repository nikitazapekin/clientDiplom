export interface CourseResponse {
  course: {
    id: string;
    title: string;
    description: string;
    type: string;
    language: string;
    tags: string[];
    logo: string;

    status: CourseStatus;
    adminId: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
  };
}

export type CourseStatus = "draft" | "published" | "archived";
