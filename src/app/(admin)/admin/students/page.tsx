"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.scss";

import { ProfileService } from "@/app/http/profile";
import type { StudentResponse} from "@/app/http/students";
import {StudentsService } from "@/app/http/students";

const StudentsPage = () => {
  const router = useRouter();
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchStudents = async (search?: string, pageNum?: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await StudentsService.getStudents({
        page: pageNum || page,
        limit,
        search: search || searchQuery,
      });

      const studentsWithEmail = await Promise.all(
        response.students.map(async (student) => {
          if (student.email?.trim()) {
            return student;
          }

          try {
            const profile = await ProfileService.getFullProfileByAuditoryId(student.auditoryId);

            return {
              ...student,
              email: profile.email || "",
            };
          } catch (profileError) {
            console.warn(`Failed to load email for student ${student.auditoryId}`, profileError);

            return student;
          }
        })
      );

      setStudents(studentsWithEmail);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setPage(response.page);
    } catch (err: any) {
      setError(err.message || "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(searchQuery, 1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchStudents("", 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchStudents(searchQuery, newPage);
    }
  };

  const handleRowClick = (auditoryId: string) => {
    router.push(`/admin/students/${auditoryId}`);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className={styles.pagination}>
        <button
          className={styles.pagination__button}
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
        >
          Пред.
        </button>

        <span className={styles.pagination__info}>
          Страница {page} из {totalPages}
        </span>

        <button
          className={styles.pagination__button}
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
        >
          След. 
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Студенты</h1>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          className={styles.searchForm__input}
          placeholder="Поиск по имени, фамилии или ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" className={styles.searchForm__button}>
          Найти
        </button>
        {searchQuery && (
          <button
            type="button"
            className={styles.searchForm__clear}
            onClick={handleClearSearch}
          >
            ✕
          </button>
        )}
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Фамилия</th>
              <th>Имя</th>
              <th>Отчество</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Страна</th>
           
         
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.empty}>
                  Студенты не найдены
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr 
                  key={student.id} 
                  onClick={() => handleRowClick(student.auditoryId)}
                  className={styles.clickableRow}
                >
                  <td className={styles.id}>{student.auditoryId}</td>
                  <td>{student.lastName}</td>
                  <td>{student.firstName}</td>
                  <td>{student.middleName || "-"}</td>
                  <td>{student.email}</td>
                  <td>{student.phone || "-"}</td>
                  <td>{student.country || "-"}</td>
                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <div className={styles.total}>Всего: {total}</div>
        {renderPagination()}
      </div>
    </div>
  );
};

export default StudentsPage;
