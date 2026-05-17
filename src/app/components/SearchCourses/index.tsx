"use client";

import { useEffect, useMemo, useState } from "react";
import Search from "@assets/icons/utils/search.png";
import Sort from "@assets/icons/utils/sort-descending.png";
import Image from "next/image";

import type { CourseFilterValues, SortOption } from "../CourseFilters/types";

import styles from "./index.module.scss";

interface SearchCoursesProps {
  filters?: CourseFilterValues;
  onApplyFilters?: (filters: CourseFilterValues) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (option: string) => void;
  onResetFilters?: () => void;
  placeholder?: string;
  sortOptions?: SortOption[];
}

const defaultSortOptions: SortOption[] = [{ label: "По названию", value: "alphabet" }];
const defaultFilters: CourseFilterValues = {
  createdFrom: "",
  createdTo: "",
  hashtags: "",
  keywords: "",
  maxLessons: "",
  maxStudents: "",
  minLessons: "",
  minStudents: "",
};

function FilterIcon() {
  return (
    <span className={styles.search__filterIcon} aria-hidden="true">
      <span className={`${styles.search__filterLine} ${styles.search__filterLineWide}`} />
      <span className={styles.search__filterDotTop} />
      <span className={`${styles.search__filterLine} ${styles.search__filterLineMedium}`} />
      <span className={styles.search__filterDotMiddle} />
      <span className={`${styles.search__filterLine} ${styles.search__filterLineShort}`} />
      <span className={styles.search__filterDotBottom} />
    </span>
  );
}

const SearchCourses = ({
  filters,
  onApplyFilters,
  onSearchChange,
  onSortChange,
  onResetFilters,
  placeholder = "Введите название курса",
  sortOptions = defaultSortOptions,
}: SearchCoursesProps) => {
  const resolvedSortOptions = sortOptions.length > 0 ? sortOptions : defaultSortOptions;
  const filterValues = filters ?? defaultFilters;
  const [searchValue, setSearchValue] = useState("");
  const [selectedSort, setSelectedSort] = useState(resolvedSortOptions[0].value);
  const [draftFilters, setDraftFilters] = useState(filterValues);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    setDraftFilters(filterValues);
  }, [filterValues]);

  const activeFilterCount = useMemo(
    () => Object.values(filterValues).filter((value) => value.trim().length > 0).length,
    [filterValues],
  );

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

  const updateDraftFilter = (field: keyof CourseFilterValues, value: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openFilters = () => {
    setDraftFilters(filterValues);
    setIsFiltersOpen(true);
  };

  const closeFilters = () => {
    setDraftFilters(filterValues);
    setIsFiltersOpen(false);
  };

  const applyFilters = () => {
    onApplyFilters?.(draftFilters);
    setIsFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    onResetFilters?.();
  };

  return (
    <>
      <div className={styles.search}>
        <div className={styles.search__topRow}>
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

          {onApplyFilters ? (
            <button className={styles.search__filterButton} type="button" onClick={openFilters}>
              <FilterIcon />
              {activeFilterCount > 0 ? (
                <span className={styles.search__filterBadge}>{activeFilterCount}</span>
              ) : null}
            </button>
          ) : null}
        </div>

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

      {isFiltersOpen ? (
        <div className={styles.search__modalOverlay} onClick={closeFilters} role="presentation">
          <div
            className={styles.search__modalCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-filters-title"
          >
            <div className={styles.search__modalHandle} />
            <div className={styles.search__modalHeader}>
              <h3 className={styles.search__modalTitle} id="course-filters-title">
                Фильтры курсов
              </h3>
              <button className={styles.search__modalCloseButton} type="button" onClick={closeFilters}>
                ✕
              </button>
            </div>

            <div className={styles.search__filtersBody}>
              <label className={styles.search__filterSection}>
                <span className={styles.search__filterSectionTitle}>Ключевые слова</span>
                <input
                  className={styles.search__filterInput}
                  placeholder="Например: frontend, react"
                  value={draftFilters.keywords}
                  onChange={(event) => updateDraftFilter("keywords", event.target.value)}
                />
              </label>

              <label className={styles.search__filterSection}>
                <span className={styles.search__filterSectionTitle}>Хештеги</span>
                <input
                  className={styles.search__filterInput}
                  placeholder="Например: javascript, basic"
                  value={draftFilters.hashtags}
                  onChange={(event) => updateDraftFilter("hashtags", event.target.value.replace(/#/g, ""))}
                />
              </label>

              <div className={styles.search__filterSection}>
                <span className={styles.search__filterSectionTitle}>Количество уроков</span>
                <div className={styles.search__rangeRow}>
                  <input
                    className={styles.search__filterInput}
                    inputMode="numeric"
                    placeholder="От"
                    value={draftFilters.minLessons}
                    onChange={(event) => updateDraftFilter("minLessons", event.target.value)}
                  />
                  <input
                    className={styles.search__filterInput}
                    inputMode="numeric"
                    placeholder="До"
                    value={draftFilters.maxLessons}
                    onChange={(event) => updateDraftFilter("maxLessons", event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.search__filterSection}>
                <span className={styles.search__filterSectionTitle}>Количество студентов</span>
                <div className={styles.search__rangeRow}>
                  <input
                    className={styles.search__filterInput}
                    inputMode="numeric"
                    placeholder="От"
                    value={draftFilters.minStudents}
                    onChange={(event) => updateDraftFilter("minStudents", event.target.value)}
                  />
                  <input
                    className={styles.search__filterInput}
                    inputMode="numeric"
                    placeholder="До"
                    value={draftFilters.maxStudents}
                    onChange={(event) => updateDraftFilter("maxStudents", event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.search__filterSection}>
                <span className={styles.search__filterSectionTitle}>Дата создания</span>
                <div className={styles.search__rangeRow}>
                  <input
                    className={styles.search__filterInput}
                    placeholder="От: 2026-05-01"
                    value={draftFilters.createdFrom}
                    onChange={(event) => updateDraftFilter("createdFrom", event.target.value)}
                  />
                  <input
                    className={styles.search__filterInput}
                    placeholder="До: 2026-05-31"
                    value={draftFilters.createdTo}
                    onChange={(event) => updateDraftFilter("createdTo", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.search__modalActions}>
              <button className={styles.search__secondaryActionButton} type="button" onClick={resetFilters}>
                Сбросить
              </button>
              <button className={styles.search__primaryActionButton} type="button" onClick={applyFilters}>
                Применить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SearchCourses;
