export interface CreateCourseRequest {
  title: string;
  description: string;
  fullDescription: string;
  type: string;
  language: string;
  tags?: string[];
  logo: string;
  status?: CourseStatus;
}

export type UpdateCourseRequest = Partial<CreateCourseRequest>;

export interface CourseListResponse {
  courses: CourseResponse[];
  total: number;
  page: number;
  pages: number;
}
export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  type: string;
  language: string;
  tags: string[];
  logo: string;

  status: CourseStatus;
  adminId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface StudentCourseResponse {
  id: string;
  title: string;
  description: string;
  type: string;
  language: string;
  tags: string[];
  logo: string;
  status: CourseStatus;
  subscribedAt: string;
  publishedAt?: string | null;
  isSubscribed: boolean;
}

export interface CourseStatsResponse {
  lessonCount: number;
  studentCount: number;
}

export type CourseStatus = "draft" | "published" | "archived";
