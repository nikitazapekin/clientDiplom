export interface CourseItem {
  item: {
    id: string;
    title: string;
    logo: string;
    lessonCount: number;
    tags: string[];
    description: string;
  };
}
