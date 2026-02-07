export interface CourseItem {
  item: {
    id: number;
    title: string;
    logo: string;
    lessonCount: number;
    tags: string[];
    description: string;
  };
}
