"use client";

import { useState } from "react";
import Search from "@assets/icons/utils/search.png";
import Sort from "@assets/icons/utils/sort-descending.png";
import Image from "next/image";

import type { SortOption } from "../CourseFilters/types";

import styles from "./index.module.scss";

interface SearchCoursesProps {
  onSearchChange: (query: string) => void;
  onSortChange: (option: string) => void;
  placeholder?: string;
  sortOptions?: SortOption[];
}

const defaultSortOptions: SortOption[] = [{ label: "По названию", value: "alphabet" }];

const SearchCourses = ({
  onSearchChange,
  onSortChange,
  placeholder = "Введите название курса",
  sortOptions = defaultSortOptions,
}: SearchCoursesProps) => {
  const resolvedSortOptions = sortOptions.length > 0 ? sortOptions : defaultSortOptions;
  const [searchValue, setSearchValue] = useState("");
  const [selectedSort, setSelectedSort] = useState(resolvedSortOptions[0].value);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchValue(value);
    onSearchChange(value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setSelectedSort(value);
    onSortChange(value);
  };

  return (
    <div className={styles.search}>
      <label className={styles.search__field}>
        <span className={styles.search__label}>Поиск по курсам</span>
        <Image src={Search} alt="icon" className={styles.search__iconSearch} />
        <input
          className={styles.search__input}
          placeholder={placeholder}
          value={searchValue}
          onChange={handleSearchChange}
        />
      </label>

      <label className={styles.search__wrapper}>
        <span className={styles.search__label}>Сортировка</span>
        <div className={styles.search__sortWrapper}>
          <Image src={Sort} className={styles.search__iconSort} alt="icon" />
          <select className={styles.search__sort} value={selectedSort} onChange={handleSortChange}>
            {resolvedSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </label>
    </div>
  );
};

export default SearchCourses;
