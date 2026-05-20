import type { CourseStatus } from "@/app/http/types/course";

export interface CourseItem {
  item: {
    id: string;
    title: string;
    logo: string;
    lessonCount?: number;
    tags: string[];
    description: string;
    type?: string;
    language?: string;
    status?: CourseStatus;
    createdAt?: string;
    updatedAt?: string;
    isSubscribed?: boolean;
  };
}
