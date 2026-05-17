export interface SortOption {
  label: string;
  value: string;
}

export interface CourseFilterValues {
  createdFrom: string;
  createdTo: string;
  hashtags: string;
  keywords: string;
  maxLessons: string;
  maxStudents: string;
  minLessons: string;
  minStudents: string;
}

export interface FiltersProps {
  handleOpen?: () => void;
  title: string;
  description: string;
  eyebrow?: string;
  ctaLabel?: string;
  showCreateButton?: boolean;
  totalCount?: number;
  searchPlaceholder?: string;
  sortOptions?: SortOption[];
  onSearchChange: (query: string) => void;
  onSortChange: (option: string) => void;
  filters?: CourseFilterValues;
  onApplyFilters?: (filters: CourseFilterValues) => void;
  onResetFilters?: () => void;
}
