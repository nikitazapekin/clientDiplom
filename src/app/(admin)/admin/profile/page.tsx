"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.scss";

import { type AdminResponse, AdminService, type AvatarResponse } from "@/app/http/admin";
import { CourseService } from "@/app/http/courses";
import type { CourseResponse } from "@/app/http/types/course";

const AdminProfilePage = () => {
  const router = useRouter();
  
  const [profile, setProfile] = useState<AdminResponse | null>(null);
  const [avatar, setAvatar] = useState<AvatarResponse | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [otherAdmins, setOtherAdmins] = useState<AdminResponse[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const auditoryId = localStorage.getItem("userId");
      
      if (!auditoryId) {
        setError("ID пользователя не найден");

        return;
      }

      const [profileData, avatarData] = await Promise.all([
        AdminService.getAdminByAuditoryId(auditoryId),
        AdminService.getAvatarByAuditoryId(auditoryId).catch(() => null),
      ]);

      if (avatarData) {
        if (avatarData.imageUrl && !avatarData.imageUrl.startsWith("data:")) {
          avatarData.imageUrl = `data:${avatarData.mimeType};base64,${avatarData.imageUrl}`;
        }
      }

      setProfile(profileData);
      setAvatar(avatarData);

      setCoursesLoading(true);
      try {
        const coursesData = await CourseService.getMyCourses();

        setCourses(coursesData);
      } catch (coursesErr) {
        console.error("Failed to load courses:", coursesErr);
      } finally {
        setCoursesLoading(false);
      }

      setAdminsLoading(true);
      try {
        const adminsData = await AdminService.getAdminsList();
        const filtered = adminsData.filter(a => a.auditoryId !== auditoryId);

        setOtherAdmins(filtered);
      } catch (adminsErr) {
        console.error("Failed to load admins:", adminsErr);
      } finally {
        setAdminsLoading(false);
      }

    } catch (err: any) {
      console.error("loadProfile error:", err);
      setError(err.message || "Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      published: { label: "Опубликован", className: styles.statusPublished },
      draft: { label: "Черновик", className: styles.statusDraft },
      archived: { label: "Архив", className: styles.statusArchived },
    };
    
    const statusInfo = statusMap[status] || statusMap.draft;

    return (
      <span className={`${styles.courseStatus} ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка профиля...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorText}>{error}</div>
        <button className={styles.retryButton} onClick={loadProfile}>
          Повторить
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorText}>Данные профиля недоступны</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarContainer}>
            {avatar ? (
              <img src={avatar.imageUrl} alt="Avatar" className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <span className={styles.avatarPlaceholderText}>
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        <h1 className={styles.name}>
          {profile.firstName} {profile.lastName}
          {profile.middleName ? ` ${profile.middleName}` : ""}
        </h1>

        <div className={styles.emailContainer}>
          <span className={styles.email}>{profile.email}</span>
        </div>

        <div className={`${styles.statusBadge} ${profile.isActive ? styles.statusActive : styles.statusInactive}`}>
          <span className={styles.statusText}>
            {profile.isActive ? "Активен" : "Не активен"}
          </span>
        </div>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{courses.length}</span>
          <span className={styles.statLabel}>Создано курсов</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{otherAdmins.length}</span>
          <span className={styles.statLabel}>Другие админы</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{profile.permissions?.length || 0}</span>
          <span className={styles.statLabel}>Разрешений</span>
        </div>
      </div>

      {coursesLoading ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Мои курсы</h2>
          <div className={styles.loadingSmall}>Загрузка курсов...</div>
        </div>
      ) : courses.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Мои курсы</h2>
          <div className={styles.coursesList}>
            {courses.map((course) => (
              <div key={course.id} className={styles.courseCard}>
                <div className={styles.courseHeader}>
                  <div className={styles.courseLogo}>
                    {course.logo ? (
                      <img src={course.logo} alt={course.title} />
                    ) : (
                      <div className={styles.courseLogoPlaceholder}>📚</div>
                    )}
                  </div>
                  <div className={styles.courseInfo}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <p className={styles.courseDesc} style={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>{course.description}</p>
                    <div className={styles.courseMeta}>
                      <span className={styles.courseLang}>{course.language}</span>
                      {course.tags && course.tags.length > 0 && (
                        <span className={styles.courseTags}>
                          {course.tags.slice(0, 3).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.courseFooter}>
                  <div className={styles.courseDates}>
                    <span>Создан: {formatDateShort(course.createdAt)}</span>
                    {course.publishedAt && (
                      <span>Опубликован: {formatDateShort(course.publishedAt)}</span>
                    )}
                  </div>
                  {getStatusBadge(course.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Мои курсы</h2>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📚</span>
            <span className={styles.emptyText}>У вас пока нет созданных курсов</span>
          </div>
        </div>
      )}

      {adminsLoading ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Другие администраторы</h2>
          <div className={styles.loadingSmall}>Загрузка администраторов...</div>
        </div>
      ) : otherAdmins.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Другие администраторы</h2>
          <div className={styles.adminsList}>
            {otherAdmins.map((admin) => (
              <div 
                key={admin.id} 
                className={styles.adminCard}
                onClick={() => router.push(`/admin/admins/${admin.auditoryId}`)}
              >
                <div className={styles.adminAvatar}>
                  <span>{admin.firstName?.[0]}{admin.lastName?.[0]}</span>
                </div>
                <div className={styles.adminInfo}>
                  <span className={styles.adminName}>
                    {admin.firstName} {admin.lastName}
                  </span>
                  <span className={styles.adminEmail}>{admin.email}</span>
                  {admin.country && (
                    <span className={styles.adminCountry}>{admin.country}</span>
                  )}
                </div>
                <div className={styles.adminStatus}>
                  <span className={`${styles.adminStatusDot} ${admin.isActive ? styles.active : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Личная информация</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Телефон</span>
            <span className={styles.infoItemValue}>{profile.phone || "-"}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Страна</span>
            <span className={styles.infoItemValue}>{profile.country || "-"}</span>
          </div>
          {profile.description && (
            <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
              <span className={styles.infoItemLabel}>Описание</span>
              <span className={styles.infoItemValue}>{profile.description}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Зарегистрирован</span>
            <span className={styles.infoItemValue}>{formatDate(profile.registeredAt)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>ID (Auditory)</span>
            <span className={styles.infoItemValue}>{profile.auditoryId}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Разрешения</span>
            <span className={styles.infoItemValue}>
              {profile.permissions?.join(", ") || "read, write"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;
