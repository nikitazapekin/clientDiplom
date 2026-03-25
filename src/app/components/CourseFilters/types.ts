export interface SortOption {
  label: string;
  value: string;
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
}
