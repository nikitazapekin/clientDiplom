"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import Button from "../Button";

import styles from "./index.module.scss";
import type { CourseModalProps } from "./types";

import { updateCourses } from "@/app/actions/updateCourses";
import { CourseService } from "@/app/http/courses";
import type { CourseStatus } from "@/app/http/types/course";

interface Field {
  id: number;
  label: string;
  placeholder: string;
  type: "input" | "textarea" | "select" | "add" | "image";
  name: string;
}

interface Tag {
  id: number;
  text: string;
}

const fields: Field[] = [
  { id: 1, label: "Название курса", placeholder: "Введите название", type: "input", name: "title" },
  {
    id: 2,
    label: "Краткое описание",
    placeholder: "Коротко опишите курс для карточки и списка курсов",
    type: "input",
    name: "description",
  },
  {
    id: 3,
    label: "Подробное описание курса",
    placeholder:
      "Расскажите, чему посвящён курс, для кого он подходит, какой результат получит студент, как устроено обучение и какие темы будут разобраны.",
    type: "textarea",
    name: "fullDescription",
  },
  { id: 4, label: "Тип курса", placeholder: "Выберите тип", type: "select", name: "type" },
  {
    id: 5,
    label: "Язык программирования",
    placeholder: "Выберите язык программирования",
    type: "select",
    name: "language",
  },
  { id: 6, label: "Теги", placeholder: "Введите тег", type: "add", name: "tags" },
  { id: 7, label: "Логотип", placeholder: "Выберите логотип", type: "image", name: "logo" },
];

const courseTypes = ["online", "offline", "hybrid"];
const languages = ["ru", "en", "fr", "es", "de", "zh"];
const courseStatuses: CourseStatus[] = ["draft", "published"];

const CreateCourseModal = ({
  isOpen,
  handleOpen,
  onSuccess,
}: CourseModalProps & { onSuccess?: () => void }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    title: "",
    description: "",
    fullDescription: "",
    type: "online",
    language: "ru",
    logo: "",
    status: "draft",
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nextTagId, setNextTagId] = useState(1);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleTagInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTag: Tag = {
        id: nextTagId,
        text: tagInput.trim(),
      };

      setTags((prev) => [...prev, newTag]);
      setTagInput("");
      setNextTagId((prev) => prev + 1);
    }
  };

  const handleRemoveTag = (id: number) => {
    setTags((prev) => prev.filter((tag) => tag.id !== id));
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setImageFile(file);

      const reader = new FileReader();

      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData((prev) => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);

      // В реальном приложении нужно загрузить файл на сервер
      // и получить URL
      try {
        // Пример загрузки на сервер:
        // const formData = new FormData();
        // formData.append('file', file);
        // const uploadResponse = await $api.post('/upload', formData);
        // setFormData(prev => ({ ...prev, logo: uploadResponse.data.url }));
      } catch (err) {
        console.error("File upload error:", err);
        setError("Ошибка загрузки изображения");
      }
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Название курса обязательно");

      return false;
    }

    if (!formData.description.trim()) {
      setError("Описание курса обязательно");

      return false;
    }

    if (!formData.fullDescription.trim()) {
      setError("Подробное описание курса обязательно");

      return false;
    }

    if (!formData.type) {
      setError("Тип курса обязателен");

      return false;
    }

    if (!formData.language) {
      setError("Язык курса обязателен");

      return false;
    }

    if (!formData.logo) {
      setError("Логотип курса обязателен");

      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const courseData = {
        title: formData.title,
        description: formData.description,
        fullDescription: formData.fullDescription,
        type: formData.type,
        language: formData.language,
        tags: tags.map((tag) => tag.text),
        logo: formData.logo,
        status: formData.status as CourseStatus,
      };

      await CourseService.createCourse(courseData);

      updateCourses();

      setFormData({
        title: "",
        description: "",
        fullDescription: "",
        type: "online",
        language: "ru",
        logo: "",
        status: "draft",
      });
      setTags([]);
      setTagInput("");
      setNextTagId(1);
      setImagePreview(null);
      setImageFile(null);

      // Закрыть модальное окно
      handleOpen();

      // Вызвать колбэк успеха
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Create course error:", err);
      setError(err.message || "Ошибка при создании курса");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: Field) => {
    switch (field.type) {
      case "input":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <input
              type="text"
              className={styles.modal__input}
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <textarea
              className={styles.modal__textarea}
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              rows={10}
            />
            <p className={styles.modal__helperText}>
              Это описание будет показано на странице курса вместо текстовой заглушки.
            </p>
            <span className={styles.modal__counter}>
              {(formData[field.name] || "").trim().length} символов
            </span>
          </div>
        );

      case "select": {
        const options =
          field.name === "type"
            ? courseTypes
            : field.name === "language"
              ? languages
              : field.name === "status"
                ? courseStatuses
                : [];

        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <select
              className={styles.modal__select}
              value={formData[field.name] || ""}
              onChange={(e) => handleSelectChange(field.name, e.target.value)}
            >
              <option value="">{field.placeholder}</option>
              {options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      }

      case "add":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <div className={styles.modal__tagContainer}>
              <div className={styles.modal__tagInputWrapper}>
                <input
                  type="text"
                  className={styles.modal__input}
                  placeholder={field.placeholder}
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <button type="button" className={styles.modal__addButton} onClick={handleAddTag}>
                  Добавить
                </button>
              </div>
              {tags.length > 0 && (
                <div className={styles.modal__tagsList}>
                  {tags.map((tag) => (
                    <div key={tag.id} className={styles.modal__tag}>
                      <span>{tag.text}</span>
                      <button
                        type="button"
                        className={styles.modal__tagRemove}
                        onClick={() => handleRemoveTag(tag.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "image":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.modal__fileInput}
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <button type="button" className={styles.modal__imageButton} onClick={handleImageClick}>
              {field.placeholder}
            </button>
            {imagePreview && (
              <div className={styles.modal__imagePreview}>
                <img src={imagePreview} alt="Preview" className={styles.modal__previewImage} />
                {imageFile && <div className={styles.modal__fileName}>{imageFile.name}</div>}
              </div>
            )}
            <div className={styles.modal__imageNote}>
              Поддерживаются форматы: JPG, PNG, GIF. Максимальный размер: 5MB
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modal__inner}>
        <h2 className={styles.modal__title}>Создать курс</h2>

        {error && <div className={styles.modal__error}>{error}</div>}

        <div className={styles.modal__fields}>
          {fields.map(renderField)}
 
          <div className={styles.modal__field}>
            <label className={styles.modal__label}>Статус курса</label>
            <select
              className={styles.modal__select}
              value={formData.status || "draft"}
              onChange={(e) => handleSelectChange("status", e.target.value)}
            >
              {courseStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === "draft" ? "Черновик" : "Опубликован"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.modal__buttons}>
          <Button
            color={"#9F0FA7"}
            width="313px"
            textColor="white"
            text={loading ? "Создание..." : "Создать"}
            onClick={handleSubmit}
          />
          <Button
            color={"#D8D8D8"}
            width="313px"
            textColor="black"
            text="Отмена"
            onClick={() => {
              handleOpen();
              setError(null);
            }}
          />
        </div>
      </div>

      <div className={styles.modal__overlay} onClick={() => !loading && handleOpen()} />
    </div>
  );
};

export default CreateCourseModal;
/* "use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import Button from "../Button";

import styles from "./index.module.scss";
import { CourseModalProps } from "./types";

interface Field {
  id: number;
  label: string;
  placeholder: string;
  type: "input" | "select" | "add" | "image";
}

interface Tag {
  id: number;
  text: string;
}

const fields: Field[] = [
  { id: 1, label: "Название курса", placeholder: "Введите название", type: "input" },
  { id: 2, label: "Описание", placeholder: "Введите описание", type: "input" },
  { id: 3, label: "Тип курса", placeholder: "Выберите тип", type: "select" },
  {
    id: 4,
    label: "Язык программирования",
    placeholder: "Выберите язык программирования",
    type: "select",
  },
  { id: 5, label: "Теги", placeholder: "Введите тег", type: "add" },
  { id: 6, label: "Логотип", placeholder: "Выберите логотип", type: "image" },
];

const CreateCourseModal = ({ isOpen, handleOpen }: CourseModalProps) => {
  const [formData, setFormData] = useState<Record<number, string>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nextTagId, setNextTagId] = useState(1);

  const handleInputChange = (id: number, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleTagInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTag: Tag = {
        id: nextTagId,
        text: tagInput.trim(),
      };

      setTags((prev) => [...prev, newTag]);
      setTagInput("");
      setNextTagId((prev) => prev + 1);
    }
  };

  const handleRemoveTag = (id: number) => {
    setTags((prev) => prev.filter((tag) => tag.id !== id));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData((prev) => ({ ...prev, [6]: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectChange = (id: number, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const renderField = (field: Field) => {
    switch (field.type) {
      case "input":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <input
              type="text"
              className={styles.modal__input}
              placeholder={field.placeholder}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            />
          </div>
        );

      case "select": {
        const options =
          field.id === 3
            ? ["Бесплатный", "Платный", "Премиум"]
            : ["JavaScript", "Python", "Java", "C++", "TypeScript", "Go"];

        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <select
              className={styles.modal__select}
              value={formData[field.id] || ""}
              onChange={(e) => handleSelectChange(field.id, e.target.value)}
            >
              <option value="">{field.placeholder}</option>
              {options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      }

      case "add":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <div className={styles.modal__tagContainer}>
              <div className={styles.modal__tagInputWrapper}>
                <input
                  type="text"
                  className={styles.modal__input}
                  placeholder={field.placeholder}
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                />
                <button type="button" className={styles.modal__addButton} onClick={handleAddTag}>
                  Добавить
                </button>
              </div>
              {tags.length > 0 && (
                <div className={styles.modal__tagsList}>
                  {tags.map((tag) => (
                    <div key={tag.id} className={styles.modal__tag}>
                      <span>{tag.text}</span>
                      <button
                        type="button"
                        className={styles.modal__tagRemove}
                        onClick={() => handleRemoveTag(tag.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "image":
        return (
          <div key={field.id} className={styles.modal__field}>
            <label className={styles.modal__label}>{field.label}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.modal__fileInput}
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <button type="button" className={styles.modal__imageButton} onClick={handleImageClick}>
              {field.placeholder}
            </button>
            {imagePreview && (
              <div className={styles.modal__imagePreview}>
                <img src={imagePreview} alt="Preview" className={styles.modal__previewImage} />
              </div>
            )}
          </div>
        );
    }
  };
  if (!isOpen) {
    return <></>;
  }
  return (
    <div className={styles.modal}>
      <div className={styles.modal__inner}>
        <h2 className={styles.modal__title}>Создать курс</h2>

        <div className={styles.modal__fields}>{fields.map(renderField)}</div>

        <div className={styles.modal__buttons}>
          <Button
            color={"#9F0FA7"}
            width="313px"
            textColor="white"
            text="Создать"
            onClick={() => {}}
          />
          <Button
            color={"#D8D8D8"}
            width="313px"
            textColor="black"
            text="Отмена"
            onClick={() => handleOpen()}
          />
        </div>
      </div>

      <div className={styles.modal__overlay}   onClick={() => handleOpen()}/>
    </div>
  );
};

export default CreateCourseModal;
 */
