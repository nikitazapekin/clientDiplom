"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./page.module.scss";

import type { CertificateResponse, CertificateSearchParams} from "@/app/http/certificate";
import {CertificateService } from "@/app/http/certificate";

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState<CertificateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    courseName: "",
    date: "",
  });

  const [searchFirstName, setSearchFirstName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchCourseName, setSearchCourseName] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");

  const fetchCertificates = useCallback(async (params?: Partial<CertificateSearchParams>) => {
    try {
      setLoading(true);
      setError(null);
      const searchParams: CertificateSearchParams = {
        firstName: searchFirstName || undefined,
        lastName: searchLastName || undefined,
        courseName: searchCourseName || undefined,
        dateFrom: searchDateFrom || undefined,
        dateTo: searchDateTo || undefined,
        page: params?.page || page,
        limit,
        ...params,
      };
      const response = await CertificateService.searchCertificates(searchParams);

      setCertificates(response.certificates);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setPage(response.page);
    } catch (err: unknown) {
      setError(err.message || "Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  }, [limit, page, searchCourseName, searchDateFrom, searchDateTo, searchFirstName, searchLastName]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCertificates({ page: 1 });
  };

  const handleClearSearch = () => {
    setSearchFirstName("");
    setSearchLastName("");
    setSearchCourseName("");
    setSearchDateFrom("");
    setSearchDateTo("");
    fetchCertificates({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchCertificates({ page: newPage });
    }
  };

  const handleEdit = (cert: CertificateResponse) => {
    setEditingId(cert.id);
    setEditData({
      firstName: cert.firstName || "",
      lastName: cert.lastName || "",
      middleName: cert.middleName || "",
      courseName: cert.courseName || "",
      date: new Date(cert.date).toISOString().split('T')[0],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      await CertificateService.updateCertificate(editingId, {
        firstName: editData.firstName,
        lastName: editData.lastName,
        middleName: editData.middleName,
        courseName: editData.courseName,
        date: editData.date,
      });
      setEditingId(null);
      fetchCertificates({ page });
    } catch (err: unknown) {
      setError(err.message || "Failed to update certificate");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({
      firstName: "",
      lastName: "",
      middleName: "",
      courseName: "",
      date: "",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await CertificateService.deleteCertificate(id);
      setShowDeleteConfirm(null);
      fetchCertificates({ page });
    } catch (err: unknown) {
      setError(err.message || "Failed to delete certificate");
    }
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
      <h1 className={styles.title}>Сертификаты</h1>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchForm__input}
            placeholder="Имя студента..."
            value={searchFirstName}
            onChange={(e) => setSearchFirstName(e.target.value)}
          />
          <input
            type="text"
            className={styles.searchForm__input}
            placeholder="Фамилия студента..."
            value={searchLastName}
            onChange={(e) => setSearchLastName(e.target.value)}
          />
          <input
            type="text"
            className={styles.searchForm__input}
            placeholder="Название курса..."
            value={searchCourseName}
            onChange={(e) => setSearchCourseName(e.target.value)}
          />
        </div>
        <div className={styles.searchRow}>
          <input
            type="date"
            className={styles.searchForm__input}
            placeholder="Дата с..."
            value={searchDateFrom}
            onChange={(e) => setSearchDateFrom(e.target.value)}
          />
          <input
            type="date"
            className={styles.searchForm__input}
            placeholder="Дата по..."
            value={searchDateTo}
            onChange={(e) => setSearchDateTo(e.target.value)}
          />
          <button type="submit" className={styles.searchForm__button}>
            Найти
          </button>
          <button
            type="button"
            className={styles.searchForm__clear}
            onClick={handleClearSearch}
          >
            ✕
          </button>
        </div>
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Фамилия</th>
              <th>Отчество</th>
              <th>Курс</th>
              <th>Дата</th>
              <th>URL</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {certificates.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  Сертификаты не найдены
                </td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id}>
                  <td className={styles.id} data-label="ID">{cert.id}</td>
                  {editingId === cert.id ? (
                    <>
                      <td data-label="Имя">
                        <input
                          type="text"
                          className={styles.editInput}
                          value={editData.firstName}
                          onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                          placeholder="Имя"
                        />
                      </td>
                      <td data-label="Фамилия">
                        <input
                          type="text"
                          className={styles.editInput}
                          value={editData.lastName}
                          onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                          placeholder="Фамилия"
                        />
                      </td>
                      <td data-label="Отчество">
                        <input
                          type="text"
                          className={styles.editInput}
                          value={editData.middleName}
                          onChange={(e) => setEditData({ ...editData, middleName: e.target.value })}
                          placeholder="Отчество"
                        />
                      </td>
                      <td data-label="Курс">
                        <input
                          type="text"
                          className={styles.editInput}
                          value={editData.courseName}
                          onChange={(e) => setEditData({ ...editData, courseName: e.target.value })}
                          placeholder="Курс"
                        />
                      </td>
                      <td data-label="Дата">
                        <input
                          type="date"
                          className={styles.editInput}
                          value={editData.date}
                          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Имя">{cert.firstName}</td>
                      <td data-label="Фамилия">{cert.lastName}</td>
                      <td data-label="Отчество">{cert.middleName}</td>
                      <td data-label="Курс">{cert.courseName}</td>
                      <td data-label="Дата">{new Date(cert.date).toLocaleDateString("ru-RU")}</td>
                    </>
                  )}
                  <td className={styles.url} data-label="URL">
                    {cert.digital ? (
                      <a href={cert.digital} target="_blank" rel="noopener noreferrer">
                        Ссылка
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={styles.actions} data-label="Действия">
                    {editingId === cert.id ? (
                      <>
                        <button
                          className={styles.saveButton}
                          onClick={handleSaveEdit}
                        >
                          Сохранить
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={handleCancelEdit}
                        >
                          Отмена
                        </button>
                      </>
                    ) : showDeleteConfirm === cert.id ? (
                      <>
                        <button
                          className={styles.confirmDeleteButton}
                          onClick={() => handleDelete(cert.id)}
                        >
                          Подтвердить
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.editButton}
                          onClick={() => handleEdit(cert)}
                        >
                          Редактировать
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => setShowDeleteConfirm(cert.id)}
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </td>
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

export default CertificatesPage;
