"use client";

import { useState } from "react";
import Search from "@assets/icons/utils/search.png";
import Sort from "@assets/icons/utils/sort-descending.png";
import Image from "next/image";

import styles from "./index.module.scss";

interface SearchCoursesProps {
  onSearchChange: (query: string) => void;
  onSortChange: (option: string) => void;
}

const SearchCourses = ({ onSearchChange, onSortChange }: SearchCoursesProps) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchValue(value);
    onSearchChange(value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    onSortChange(value);
  };

  return (
    <div className={styles.search}>
      <div className={styles.search__field}>
        <Image src={Search} alt="icon" className={styles.search__iconSearch} />
        <input
          className={styles.search__input}
          placeholder="Введите название курса"
          value={searchValue}
          onChange={handleSearchChange}
        />
      </div>
      <div className={styles.search__wrapper}>
        <Image src={Sort} className={styles.search__iconSort} alt={"Icon"} />
        <select className={styles.search__sort} onChange={handleSortChange}>
          <option>По алфавиту</option>
          <option>По количеству студентов</option>
          <option>По количеству уроков</option>
          <option>Все</option>
        </select>
      </div>
    </div>
  );
};

export default SearchCourses;
