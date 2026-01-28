"use client";

import Search from "@assets/icons/utils/search.png";
import Sort from "@assets/icons/utils/sort-descending.png";
import Image from "next/image";

import styles from "./index.module.scss";

const SearchCourses = () => {
  return (
    <div className={styles.search}>
      <div className={styles.search__field}>
        <Image src={Search} alt="icon" className={styles.search__iconSearch} />
        <input className={styles.search__input} placeholder="Введите название курса" />
      </div>
      <div className={styles.search__wrapper}>
        <Image src={Sort} className={styles.search__iconSort} alt={"Icon"} />
        <select className={styles.search__sort}>
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
