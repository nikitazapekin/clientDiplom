'use client';

import React, { useCallback, useEffect, useState } from 'react';

import CertificateAwardModal from '../CertificateAwardModal';
import FriendsModal from '../FriendsModal';
import StudentLevelWheel from '../StudentLevelWheel';

import styles from './index.module.scss';

import { AuthService } from '@/app/http/auth';
import type { CertificateResponse } from '@/app/http/certificate';
import { CertificateService } from '@/app/http/certificate';
import { type CodeTask, CodingTasksService, type StudentLevel } from '@/app/http/codingTasksService';
import { getErrorMessage } from '@/app/http/errorUtils';
import { ProfileService } from '@/app/http/profile';
import type { FullClientInfo } from '@/app/http/types/profile';

 
const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  easy: { label: 'Легкий', color: '#4caf50' },
  medium: { label: 'Средний', color: '#ff9800' },
  hard: { label: 'Сложный', color: '#f44336' },
};

 
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
        <h4 className={styles.taskTitle}>  {task.title}</h4>
        <span className={styles.badge} style={{ backgroundColor: diffInfo.color }}>
          {diffInfo.label}
        </span>
      </div>
    
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
 
const formatCertificateDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const CertificateCard = ({
  certificate,
  onPress,
}: {
  certificate: CertificateResponse;
  onPress: () => void;
}) => (
  <div className={styles.certificateCard} onClick={onPress}>
    <div className={styles.certificateCardHeader}>
      <h4 className={styles.certificateCardTitle}>{certificate.courseName}</h4>
    </div>
    <img
      src={certificate.url}
      alt={`Сертификат курса ${certificate.courseName}`}
      className={styles.certificateThumb}
    />
    <div className={styles.certificateCardFooter}>
      <span className={styles.certificateDateBadge}>{formatCertificateDate(certificate.date)}</span>
    </div>
  </div>
);

const CertificatesPreview = ({
  certificates,
  onViewAll,
  onOpenCertificate,
}: {
  certificates: CertificateResponse[];
  onViewAll: () => void;
  onOpenCertificate: (certificate: CertificateResponse) => void;
}) => {
  const recentCertificates = [...certificates]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  if (recentCertificates.length === 0) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Сертификаты</h3>
        {certificates.length > 4 ? (
          <button className={styles.viewAllLink} onClick={onViewAll}>
            Просмотреть все
          </button>
        ) : null}
      </div>

      {recentCertificates.map((certificate) => (
        <CertificateCard
          key={certificate.id}
          certificate={certificate}
          onPress={() => onOpenCertificate(certificate)}
        />
      ))}
    </div>
  );
};

const AllCertificatesModal = ({
  visible,
  onClose,
  certificates,
  onOpenCertificate,
}: {
  visible: boolean;
  onClose: () => void;
  certificates: CertificateResponse[];
  onOpenCertificate: (certificate: CertificateResponse) => void;
}) => {
  const sortedCertificates = [...certificates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (!visible) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Все сертификаты</h2>
          <button className={styles.modalCloseButton} onClick={onClose}>
            <span className={styles.modalCloseText}>✕</span>
          </button>
        </div>

        <div className={styles.modalListContent}>
          {sortedCertificates.length === 0 ? (
            <div className={styles.emptyContainer}>
              <p className={styles.emptyText}>У вас ещё нет сертификатов</p>
            </div>
          ) : (
            sortedCertificates.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                onPress={() => {
                  onClose();
                  onOpenCertificate(certificate);
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

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
          Просмотреть все 
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
            Выбрать файл
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
  const [codingTasks, setCodingTasks] = useState<CodeTask[]>([]);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);
  const [codingLoading, setCodingLoading] = useState(false);
  const [showAllSolvedModal, setShowAllSolvedModal] = useState(false);
  const [showAllCertificatesModal, setShowAllCertificatesModal] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [awardCertificate, setAwardCertificate] = useState<CertificateResponse | null>(null);
  const [certificateAwardModalOpen, setCertificateAwardModalOpen] = useState(false);

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

     
      if (profileData.avatar) {
        if (
          profileData.avatar.imageUrl &&
          !profileData.avatar.imageUrl.startsWith('data:')
        ) {
          profileData.avatar.imageUrl = `data:${profileData.avatar.mimeType};base64,${profileData.avatar.imageUrl}`;
        }
      }

      setProfile(profileData);

     
      setCertificatesLoading(true);
      try {
        const certs = await CertificateService.getCertificatesByAuditoryId(userId);

        setCertificates(certs);

        const unviewedCertificate = certs.find((certificate) => !certificate.isViewed);

        if (unviewedCertificate) {
          setAwardCertificate(unviewedCertificate);
          setCertificateAwardModalOpen(true);
        }
      } catch (certErr) {
        console.error('Failed to load certificates:', certErr);
      } finally {
        setCertificatesLoading(false);
      }

   
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load profile'));
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

  const refreshStudentLevel = useCallback(async () => {
    try {
      const levelData = await CodingTasksService.getStudentLevel();

      setStudentLevel(levelData);
    } catch (codingErr) {
      console.error('Failed to refresh student level:', codingErr);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refreshCertificates = useCallback(async () => {
    const userId = AuthService.getCurrentUser().userId;

    if (!userId) {
      return;
    }

    try {
      const certs = await CertificateService.getCertificatesByAuditoryId(userId);

      setCertificates(certs);
    } catch (certErr) {
      console.error('Failed to refresh certificates:', certErr);
    }
  }, []);

  useEffect(() => {
    const handleStudentLevelUpdated = () => {
      void refreshStudentLevel();
    };

    const handleCertificateAwarded = (event: Event) => {
      const certificate = (event as CustomEvent<CertificateResponse>).detail;

      if (certificate) {
        setAwardCertificate(certificate);
        setCertificateAwardModalOpen(true);
      }

      void refreshCertificates();
    };

    const handleCertificatesUpdated = () => {
      void refreshCertificates();
    };

    window.addEventListener('student-level-updated', handleStudentLevelUpdated);
    window.addEventListener('certificate-awarded', handleCertificateAwarded as EventListener);
    window.addEventListener('certificates-updated', handleCertificatesUpdated);

    return () => {
      window.removeEventListener('student-level-updated', handleStudentLevelUpdated);
      window.removeEventListener('certificate-awarded', handleCertificateAwarded as EventListener);
      window.removeEventListener('certificates-updated', handleCertificatesUpdated);
    };
  }, [refreshStudentLevel, refreshCertificates]);

  const closeCertificateAwardModal = async () => {
    if (awardCertificate?.id) {
      try {
        await CertificateService.setIsViewed(awardCertificate.id);
      } catch (closeError) {
        console.error('Failed to mark certificate as viewed:', closeError);
      }
    }

    setCertificateAwardModalOpen(false);
    setAwardCertificate(null);
    void refreshCertificates();
    window.dispatchEvent(new CustomEvent('certificates-updated'));
  };

  const openCertificateUrl = (certificate: CertificateResponse) => {
    window.open(certificate.url, '_blank', 'noopener,noreferrer');
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
        } catch (err: unknown) {
          console.error('Avatar upload error:', err);
          alert('Failed to upload avatar: ' + getErrorMessage(err, 'Unknown error'));
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.onerror = () => {
        setUploadingAvatar(false);
        alert('Failed to read file');
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      setUploadingAvatar(false);
      alert('Failed to upload avatar: ' + getErrorMessage(err, 'Unknown error'));
    }
  };

  const handleTaskPress = (taskId: string) => {
   
    console.log('Navigate to task:', taskId);
    
  };

 
  const currentLevel = studentLevel?.level || 1;
  const currentExp = studentLevel?.experience || 0;

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

  return (
    <>
      <div className={styles.container}>
 
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

            {!profile.avatar && !uploadingAvatar && (
              <div className={styles.cameraBadge}>
                <span className={styles.cameraBadgeText}>+</span>
              </div>
            )}
          </div>

          <h1 className={styles.name}>
            {profile.lastName} {profile.firstName}
            {profile.middleName ? ` ${profile.middleName}` : ''}
          </h1>

          <div className={styles.emailContainer}>
            <p className={styles.email}>{profile.email}</p>
          </div>
        </div>

     
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

        <div className={styles.friendsButtonContainer}>
          <button
            className={styles.friendsButton}
            onClick={() => setFriendsModalVisible(true)}
          >
            Друзья
          </button>
        </div>

     
        {!codingLoading && studentLevel && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Мой прогресс в задачах</h3>
            <div className={styles.levelSection}>
              <StudentLevelWheel level={currentLevel} experience={currentExp} />
            </div>
          </div>
        )}

      
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

     
        {certificatesLoading ? (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Сертификаты</h3>
            <div className={styles.sectionLoading}>Загрузка...</div>
          </div>
        ) : (
          <CertificatesPreview
            certificates={certificates}
            onViewAll={() => setShowAllCertificatesModal(true)}
            onOpenCertificate={openCertificateUrl}
          />
        )}

        <div className={styles.logoutButton}>
          <button
            className={styles.logoutButtonInner}
            onClick={async () => {
           
                await AuthService.logout();
             
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

     
      <AllSolvedTasksModal
        visible={showAllSolvedModal}
        onClose={() => setShowAllSolvedModal(false)}
        solvedTasks={studentLevel?.solvedTasks ?? []}
        allTasks={codingTasks}
        onTaskPress={handleTaskPress}
      />

      <AllCertificatesModal
        visible={showAllCertificatesModal}
        onClose={() => setShowAllCertificatesModal(false)}
        certificates={certificates}
        onOpenCertificate={openCertificateUrl}
      />

      {awardCertificate ? (
        <CertificateAwardModal
          certificate={awardCertificate}
          isOpen={certificateAwardModalOpen}
          onClose={() => void closeCertificateAwardModal()}
        />
      ) : null}

      {friendsModalVisible && (
        <FriendsModal onClose={() => setFriendsModalVisible(false)} />
      )}
    </>
  );
};

export default UserProfile;
