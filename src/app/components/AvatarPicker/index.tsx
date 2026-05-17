'use client';

import React, { useRef,useState } from 'react';

import styles from './index.module.scss';

import { ProfileService } from '@/app/http/profile';

interface AvatarPickerProps {
  visible: boolean;
  onClose: () => void;
  auditoryId: string;
  onAvatarUploaded: (avatarUrl: string) => void;
}

const AvatarPicker: React.FC<AvatarPickerProps> = ({
  visible,
  onClose,
  auditoryId,
  onAvatarUploaded,
}) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setLoading(true);

      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const base64Only = base64.split(',')[1] || base64;
          const mimeType = file.type || 'image/jpeg';

          const uploadResponse = await ProfileService.uploadAvatarBase64(
            auditoryId,
            base64Only,
            mimeType
          );

          if (uploadResponse && uploadResponse.imageUrl) {
            onAvatarUploaded(uploadResponse.imageUrl);
           
            onClose();
          }
        } catch (error: any) {
          console.error('Upload error:', error);
        
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setLoading(false);
  
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('File error:', error);
      setLoading(false);
    
    }
 
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    if (confirm('Вы уверены, что хотите удалить аватар?')) {
      setLoading(true);
      ProfileService.deleteAvatarByAuditoryId(auditoryId)
        .then(() => {
          onAvatarUploaded('');
       
          onClose();
        })
        .catch((error: any) => {
          console.error('Remove error:', error);
      
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Аватар профиля</h2>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Загрузка...</p>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.fileInput}
            />

            <button className={styles.optionButton} onClick={handleSelectFromGallery}>
              <span className={styles.optionIcon}> </span>
              <span className={styles.optionText}>Выбрать из галереи</span>
            </button>

            <button className={`${styles.optionButton} ${styles.removeButton}`} onClick={handleRemoveAvatar}>
              <span className={styles.optionIcon}> </span>
              <span className={`${styles.optionText} ${styles.removeText}`}>
                Удалить аватар
              </span>
            </button>

            <button className={styles.cancelButton} onClick={onClose}>
              <span className={styles.cancelText}>Отмена</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AvatarPicker;
