"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import Button from "../Button";

import styles from "./index.module.scss";

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

const CreateCourseModal = () => {
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
            onClick={() => {}}
          />
        </div>
      </div>

      <div className={styles.modal__overlay} />
    </div>
  );
};

export default CreateCourseModal;
