'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from './index.module.scss';

import { ProfileService } from '@/app/http/profile';
import { CertificateService } from '@/app/http/certificate';
import type { CertificateResponse } from '@/app/http/certificate';
import type { FullClientInfo } from '@/app/http/types/profile';
import { CodingTasksService, type CodeTask, type StudentLevel } from '@/app/http/codingTasksService';
import AvatarPicker from '../AvatarPicker';
import { AuthService } from '@/app/http/auth';

// Цвета для сложности задач
const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  easy: { label: 'Легкий', color: '#4caf50' },
  medium: { label: 'Средний', color: '#ff9800' },
  hard: { label: 'Сложный', color: '#f44336' },
};

// Компонент круглого прогресс-бара
const CircularProgress = ({
  progress,
  level,
  experience,
  nextLevelExp,
}: {
  progress: number;
  level: number;
  experience: number;
  nextLevelExp: number;
}) => {
  const CIRCLE_SIZE = 150;
  const strokeWidth = 8;
  const center = CIRCLE_SIZE / 2;
  const radius = (CIRCLE_SIZE / 2) * 0.85;
  const circumference = 2 * Math.PI * radius;

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <div className={styles.circularProgressContainer}>
      <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
        {/* Фоновый круг */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e9ecef"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Прогресс (по часовой стрелке) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#667eea"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />

        {/* Текст уровня в центре */}
        <text
          x={center}
          y={center - 8}
          fontSize="24"
          fontWeight="bold"
          fill="#212529"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {level}
        </text>

        <text
          x={center}
          y={center + 16}
          fontSize="12"
          fill="#6c757d"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          УРОВЕНЬ
        </text>
      </svg>

      <div className={styles.expInfoContainer}>
        <span className={styles.expValue}>{experience}</span>
        <span className={styles.expSeparator}>/</span>
        <span className={styles.expTotal}>{nextLevelExp}</span>
        <span className={styles.expLabel}>XP</span>
      </div>
    </div>
  );
};

// Компонент карточки решенной задачи
const SolvedTaskCard = ({
  task,
  solvedAt,
  onPress,
}: {
  task: CodeTask;
  solvedAt: string;
  onPress: () => void;
}) => {
  const diffInfo = DIFFICULTIES[task.difficulty] || DIFFICULTIES.easy;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={`${styles.taskCard} ${styles.taskCardSolved}`} onClick={onPress}>
      <div className={styles.taskHeader}>
        <h4 className={styles.taskTitle}>✅ {task.title}</h4>
        <span className={styles.badge} style={{ backgroundColor: diffInfo.color }}>
          {diffInfo.label}
        </span>
      </div>
      <p className={styles.taskDesc}>{task.description}</p>
      <div className={styles.taskFooter}>
        <span className={styles.taskMeta}>
          {(task.languages || []).join(', ')} | {task.testCases?.length ?? 0} тестов
        </span>
        <span className={styles.solvedDateBadge}>{formatDate(solvedAt)}</span>
      </div>
      <div className={styles.taskFooter}>
        <span className={styles.authorText}>Автор: {task.authorName}</span>
        <span className={styles.xpBadge}>+{task.experienceReward} XP</span>
      </div>
    </div>
  );
};

// Компонент для отображения превью решенных задач
const SolvedTasksPreview = ({
  solvedTasks,
  allTasks,
  onViewAll,
  onTaskPress,
}: {
  solvedTasks: Array<{ codeTaskId: string; solvedAt: string }>;
  allTasks: CodeTask[];
  onViewAll: () => void;
  onTaskPress: (taskId: string) => void;
}) => {
  const recentSolved = [...solvedTasks]
    .sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime())
    .slice(0, 4);

  if (recentSolved.length === 0) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Решенные задачи</h3>
        <button className={styles.viewAllLink} onClick={onViewAll}>
          Просмотреть все →
        </button>
      </div>

      {recentSolved.map((solved) => {
        const task = allTasks.find((t) => t.id === solved.codeTaskId);
        if (!task) return null;

        return (
          <SolvedTaskCard
            key={solved.codeTaskId}
            task={task}
            solvedAt={solved.solvedAt}
            onPress={() => onTaskPress(task.id)}
          />
        );
      })}
    </div>
  );
};

// Компонент модального окна со всеми решенными задачами
const AllSolvedTasksModal = ({
  visible,
  onClose,
  solvedTasks,
  allTasks,
  onTaskPress,
}: {
  visible: boolean;
  onClose: () => void;
  solvedTasks: Array<{ codeTaskId: string; solvedAt: string }>;
  allTasks: CodeTask[];
  onTaskPress: (taskId: string) => void;
}) => {
  const sortedTasks = [...solvedTasks].sort(
    (a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime()
  );

  if (!visible) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Все решенные задачи</h2>
          <button className={styles.modalCloseButton} onClick={onClose}>
            <span className={styles.modalCloseText}>✕</span>
          </button>
        </div>

        <div className={styles.modalListContent}>
          {sortedTasks.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyIcon}>📚</div>
              <p className={styles.emptyText}>У вас еще нет решенных задач</p>
            </div>
          ) : (
            sortedTasks.map((item) => {
              const task = allTasks.find((t) => t.id === item.codeTaskId);
              if (!task) return null;

              return (
                <SolvedTaskCard
                  key={item.codeTaskId}
                  task={task}
                  solvedAt={item.solvedAt}
                  onPress={() => {
                    onClose();
                    onTaskPress(task.id);
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Компонент модального окна выбора аватара
const AvatarPickerModal = ({
  visible,
  onClose,
  onUpload,
}: {
  visible: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!visible) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Изменить аватар</h2>
          <button className={styles.modalCloseButton} onClick={onClose}>
            <span className={styles.modalCloseText}>✕</span>
          </button>
        </div>

        <div className={styles.modalBody}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          <button
            className={styles.avatarOptionButton}
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Выбрать файл
          </button>
        </div>
      </div>
    </div>
  );
};

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<FullClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [certificates, setCertificates] = useState<CertificateResponse[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [activeCertIndex, setActiveCertIndex] = useState(0);

  // Состояния для задач и уровня
  const [codingTasks, setCodingTasks] = useState<CodeTask[]>([]);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);
  const [codingLoading, setCodingLoading] = useState(false);
  const [showAllSolvedModal, setShowAllSolvedModal] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = AuthService.getCurrentUser().userId;

      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const profileData = await ProfileService.getFullProfileByAuditoryId(userId);

      // Проверяем и обрабатываем аватар
      if (profileData.avatar) {
        if (
          profileData.avatar.imageUrl &&
          !profileData.avatar.imageUrl.startsWith('data:')
        ) {
          profileData.avatar.imageUrl = `data:${profileData.avatar.mimeType};base64,${profileData.avatar.imageUrl}`;
        }
      }

      setProfile(profileData);

      // Загружаем сертификаты
      setCertificatesLoading(true);
      try {
        const certs = await CertificateService.getCertificatesByAuditoryId(userId);
        setCertificates(certs);
      } catch (certErr) {
        console.error('Failed to load certificates:', certErr);
      } finally {
        setCertificatesLoading(false);
      }

      // Загружаем данные по задачам
      setCodingLoading(true);
      try {
        const [tasksData, levelData] = await Promise.all([
          CodingTasksService.getAllTasks(),
          CodingTasksService.getStudentLevel().catch(() => null),
        ]);
        setCodingTasks(tasksData);
        setStudentLevel(levelData);
      } catch (codingErr) {
        console.error('Failed to load coding tasks:', codingErr);
      } finally {
        setCodingLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleAvatarUploaded = (avatarUrl: string) => {
    if (profile) {
      if (avatarUrl) {
        setProfile({
          ...profile,
          avatar: {
            ...profile.avatar!,
            imageUrl: avatarUrl,
          },
        });
        loadProfile();
      } else {
        setProfile({
          ...profile,
          avatar: undefined,
        });
      }
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleAvatarPress = () => {
    setAvatarPickerVisible(true);
  };

  const handleUploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const userId = AuthService.getCurrentUser().userId;
      if (!userId) throw new Error('User not authenticated');

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const base64Only = base64.split(',')[1] || base64;
          const mimeType = file.type || 'image/jpeg';

          await ProfileService.uploadAvatarBase64(userId, base64Only, mimeType);
          handleAvatarUploaded(base64);
          setAvatarPickerVisible(false);
        } catch (err: any) {
          console.error('Avatar upload error:', err);
          alert('Failed to upload avatar: ' + (err.message || 'Unknown error'));
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.onerror = () => {
        setUploadingAvatar(false);
        alert('Failed to read file');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingAvatar(false);
      alert('Failed to upload avatar: ' + (err.message || 'Unknown error'));
    }
  };

  const handleTaskPress = (taskId: string) => {
    // Navigate to coding solve page - for now just log
    console.log('Navigate to task:', taskId);
    // In real app: router.push(`/coding/${taskId}`);
  };

  // Вычисляем данные для прогресс-бара
  const getRequiredExp = (level: number) => Math.pow(10, level - 1);

  const currentLevel = studentLevel?.level || 1;
  const currentExp = studentLevel?.experience || 0;
  const requiredExp = getRequiredExp(currentLevel);
  const progress = currentExp / requiredExp;

  const solvedTasksCount = studentLevel?.solvedTasks?.length ?? 0;

  if (loading && !refreshing) {
    return (
      <div className={styles.centerContainer}>
        <div className={styles.loadingText}>Загрузка профиля...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorText}>{error}</div>
        <button className={styles.retryButton} onClick={loadProfile}>
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.centerContainer}>
        <div className={styles.noDataText}>Нет данных профиля</div>
      </div>
    );
  }

  const auditoryId = profile.auditoryId;

  return (
    <>
      <div className={styles.container}>
        {/* Header с аватаром */}
        <div className={styles.header}>
          <div
            className={styles.avatarContainer}
            onClick={handleAvatarPress}
            style={{ cursor: 'pointer' }}
          >
            {uploadingAvatar ? (
              <div className={`${styles.avatar} ${styles.avatarUploading}`}>
                <div style={{ color: 'white', fontSize: '24px' }}>⏳</div>
              </div>
            ) : profile.avatar ? (
              <img src={profile.avatar.imageUrl} alt="Avatar" className={styles.avatar} />
            ) : (
              <div className={`${styles.avatar} ${styles.avatarPlaceholder}`}>
                {profile.firstName?.[0]}
                {profile.lastName?.[0]}
              </div>
            )}

            <div className={styles.cameraBadge}>
              <span className={styles.cameraBadgeText}>📷</span>
            </div>
          </div>

          <h1 className={styles.name}>
            {profile.firstName} {profile.lastName}
            {profile.middleName ? ` ${profile.middleName}` : ''}
          </h1>

          <div className={styles.emailContainer}>
            <p className={styles.email}>{profile.email}</p>
          </div>
        </div>

        {/* Статистика пользователя */}
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{certificates.length}</span>
            <span className={styles.statLabel}>Сертификатов</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{solvedTasksCount}</span>
            <span className={styles.statLabel}>Задач</span>
          </div>
        </div>

        {/* Секция с уровнем и прогрессом */}
        {!codingLoading && studentLevel && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Мой прогресс в задачах</h3>
            <div className={styles.levelSection}>
              <CircularProgress
                progress={progress}
                level={currentLevel}
                experience={currentExp}
                nextLevelExp={requiredExp}
              />
            </div>
          </div>
        )}

        {/* Превью решенных задач */}
        {!codingLoading &&
          studentLevel?.solvedTasks &&
          studentLevel.solvedTasks.length > 0 &&
          codingTasks.length > 0 && (
            <SolvedTasksPreview
              solvedTasks={studentLevel.solvedTasks}
              allTasks={codingTasks}
              onViewAll={() => setShowAllSolvedModal(true)}
              onTaskPress={handleTaskPress}
            />
          )}

        {/* Личная информация */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Личная информация</h3>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoItemLabel}>Телефон</span>
              <span className={styles.infoItemValue}>{profile.phone}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoItemLabel}>Страна</span>
              <span className={styles.infoItemValue}>{profile.country}</span>
            </div>

            {profile.description ? (
              <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
                <span className={styles.infoItemLabel}>Описание</span>
                <span className={styles.infoItemValue}>{profile.description}</span>
              </div>
            ) : null}

            <div className={styles.infoItem}>
              <span className={styles.infoItemLabel}>Зарегистрирован</span>
              <span className={styles.infoItemValue}>
                {new Date(profile.registeredAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {profile.lastLoginAt && (
              <div className={styles.infoItem}>
                <span className={styles.infoItemLabel}>Последний вход</span>
                <span className={styles.infoItemValue}>
                  {new Date(profile.lastLoginAt).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Сертификаты */}
        {certificatesLoading ? (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Сертификаты</h3>
            <div style={{ marginTop: 12, textAlign: 'center' }}>Загрузка...</div>
          </div>
        ) : certificates.length > 0 ? (
          <div className={styles.certSection}>
            <h3 className={styles.sectionTitle}>Сертификаты</h3>
            <div className={styles.certSliderContainer}>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '16px' }}>
                {certificates.map((cert) => (
                  <div key={cert.id} style={{ minWidth: '300px', textAlign: 'center' }}>
                    <img
                      src={cert.url}
                      alt="Certificate"
                      className={styles.certImage}
                      style={{ height: '250px' }}
                    />
                    <p className={styles.certDate}>
                      {new Date(cert.date).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Status Badge */}
        <div className={styles.statusContainer}>
          <div
            className={`${styles.statusBadge} ${profile.isActive ? styles.statusActive : styles.statusInactive}`}
          >
            <span className={styles.statusText}>
              {profile.isActive ? 'В сети' : 'Не в сети'}
            </span>
          </div>
        </div>

        {/* Кнопка выхода */}
        <div className={styles.logoutButton}>
          <button
            className={styles.logoutButtonInner}
            onClick={async () => {
              if (confirm('Вы уверены, что хотите выйти?')) {
                await AuthService.logout();
              }
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      <AvatarPickerModal
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        onUpload={handleUploadAvatar}
      />

      {/* Модальное окно со всеми решенными задачами */}
      <AllSolvedTasksModal
        visible={showAllSolvedModal}
        onClose={() => setShowAllSolvedModal(false)}
        solvedTasks={studentLevel?.solvedTasks ?? []}
        allTasks={codingTasks}
        onTaskPress={handleTaskPress}
      />
    </>
  );
};

export default UserProfile;
