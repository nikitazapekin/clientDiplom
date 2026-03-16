"use client";

import { useEffect, useState } from "react";
import { CertificateService, CertificateResponse, CertificateSearchParams } from "@/app/http/certificate";
import styles from "./page.module.scss";

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState<CertificateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [searchFirstName, setSearchFirstName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchCourseName, setSearchCourseName] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");

  const fetchCertificates = async (params?: Partial<CertificateSearchParams>) => {
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
    } catch (err: any) {
      setError(err.message || "Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

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
    setEditDate(new Date(cert.date).toISOString().split('T')[0]);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await CertificateService.updateCertificate(editingId, {
        date: editDate,
      });
      setEditingId(null);
      fetchCertificates({ page });
    } catch (err: any) {
      setError(err.message || "Failed to update certificate");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate("");
  };

  const handleDelete = async (id: string) => {
    try {
      await CertificateService.deleteCertificate(id);
      setShowDeleteConfirm(null);
      fetchCertificates({ page });
    } catch (err: any) {
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
          ← Пред.
        </button>

        <span className={styles.pagination__info}>
          Страница {page} из {totalPages}
        </span>

        <button
          className={styles.pagination__button}
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
        >
          След. →
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
              <th>ID клиента</th>
              <th>ID курса</th>
              <th>Дата</th>
              <th>URL</th>
              <th>Просмотрен</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {certificates.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Сертификаты не найдены
                </td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id}>
                  <td className={styles.id}>{cert.id}</td>
                  <td className={styles.mono}>{cert.clientId}</td>
                  <td className={styles.mono}>{cert.courseId}</td>
                  <td>
                    {editingId === cert.id ? (
                      <input
                        type="date"
                        className={styles.editInput}
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    ) : (
                      new Date(cert.date).toLocaleDateString("ru-RU")
                    )}
                  </td>
                  <td className={styles.url}>
                    {cert.digital ? (
                      <a href={cert.digital} target="_blank" rel="noopener noreferrer">
                        Ссылка
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span className={`${styles.status} ${cert.isViewed ? styles.status_viewed : styles.status_notViewed}`}>
                      {cert.isViewed ? "Да" : "Нет"}
                    </span>
                  </td>
                  <td className={styles.actions}>
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
