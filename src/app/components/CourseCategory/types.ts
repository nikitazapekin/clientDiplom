interface Course {
  id: string;
  title: string;
  logo: string;
  lessonCount: number;
  description: string;
  tags: string[];
}
export interface CourseCategoryProps {
  title: string;
  courses: Course[];
}
