import React, { useCallback, useEffect, useState } from "react";

import type { LessonResponse } from "@/app/http/lessonService";
import { LessonService } from "@/app/http/lessonService";
 
enum CheckpointType {
  QUIZ = "quiz",
  PRACTICAL_TASK = "practical_task",
  EXAM = "exam",
  PROJECT = "project",
}

interface CheckpointResponse {
  id: string;
  mapElementId: string;
  title: string;
  description: string;
  type: CheckpointType;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  instructions?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ElementPropertiesEditorProps {
  element: {
    id: string;
    type: string;
    title?: string;
  };
  onUpdate: () => void;
}

const ElementPropertiesEditor: React.FC<ElementPropertiesEditorProps> = ({ element, onUpdate }) => {
  const [lessonData, setLessonData] = useState<LessonResponse | null>(null);
  const [checkpointData, setCheckpointData] = useState<CheckpointResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    
    content: "",
    duration: 0,
    orderIndex: 0,
    isPublished: false,
   
    type: "quiz" as CheckpointType,
    passingScore: 70,
    maxAttempts: 3,
    timeLimit: 60,
    instructions: "",
  });
 
  const loadElementData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (element.type === "lesson") {
        const data = await LessonService.getLessonByMapElementId(element.id);

        setLessonData(data);
        setFormData({
          title: data.title || "",
          description: data.description || "",
          content: data.content || "",
          duration: data.duration || 60,
          orderIndex: data.orderIndex || 0,
          isPublished: data.isPublished || false,
          type: CheckpointType.QUIZ,
          passingScore: 70,
          maxAttempts: 3,
          timeLimit: 60,
          instructions: "",
        });
      } else if (element.type === "checkpoint") {
      
        const response = await fetch(
          `http://localhost:3002/checkpoints/map-element/${element.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        if (response.ok) {
          const data = (await response.json()) as CheckpointResponse;

          setCheckpointData(data);
          setFormData({
            title: data.title || "",
            description: data.description || "",
            content: "",
            duration: 0,
            orderIndex: 0,
            isPublished: data.isPublished || false,
            type: data.type || "quiz",
            passingScore: data.passingScore || 70,
            maxAttempts: data.maxAttempts || 3,
            timeLimit: data.timeLimit || 60,
            instructions: data.instructions || "",
          });
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
    } catch (error: unknown) {
      console.error("Error loading element data:", error);
      setError("Не удалось загрузить данные элемента");
 
      setFormData({
        title: element.title || "",
        description: "",
        content: "",
        duration: 60,
        orderIndex: 0,
        isPublished: false,
        type: CheckpointType.QUIZ,
        passingScore: 70,
        maxAttempts: 3,
        timeLimit: 60,
        instructions: "",
      });
    } finally {
      setIsLoading(false);
    }
  }, [element.id, element.title, element.type]);

  useEffect(() => {
    if (element.id && (element.type === "lesson" || element.type === "checkpoint")) {
      loadElementData();
    }
  }, [element.id, element.type, loadElementData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checkbox = e.target as HTMLInputElement;

      setFormData((prev) => ({ ...prev, [name]: checkbox.checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (element.type === "lesson" && lessonData) {
        await LessonService.updateLesson(lessonData.id, {
          title: formData.title,
          description: formData.description,
          content: formData.content,
          duration: formData.duration,
          orderIndex: formData.orderIndex,
          isPublished: formData.isPublished,
        });
      } else if (element.type === "checkpoint") {
    
        const url = checkpointData?.id
          ? `http://localhost:3002/checkpoints/${checkpointData.id}`
          : `http://localhost:3002/checkpoints`;

        const method = checkpointData?.id ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            type: formData.type,
            passingScore: formData.passingScore,
            maxAttempts: formData.maxAttempts,
            timeLimit: formData.timeLimit,
            instructions: formData.instructions,
            isPublished: formData.isPublished,
            ...(method === "POST" && { mapElementId: element.id }),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
 
      onUpdate();
    } catch (error: unknown) {
      console.error("Error saving element data:", error);
      setError("Не удалось сохранить изменения");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Загрузка данных...</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "500px" }}>
      <h3 style={{ marginBottom: "20px", color: "#333" }}>
        {element.type === "lesson" ? "Редактирование урока" : "Редактирование контрольной точки"}
      </h3>

      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
          Название:
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
          Описание:
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            resize: "vertical",
          }}
        />
      </div>

      {element.type === "lesson" && (
        <>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Содержание (HTML):
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={6}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                resize: "vertical",
                fontFamily: "monospace",
              }}
              placeholder="<h1>Заголовок</h1><p>Текст урока...</p>"
            />
          </div>

          <div style={{ marginBottom: "15px", display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Длительность (мин):
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Порядковый номер:
              </label>
              <input
                type="number"
                name="orderIndex"
                value={formData.orderIndex}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
        </>
      )}

      {element.type === "checkpoint" && (
        <>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Тип контрольной точки:
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option value="quiz">Тест</option>
              <option value="practical_task">Практическое задание</option>
              <option value="exam">Экзамен</option>
              <option value="project">Проект</option>
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Проходной балл:
            </label>
            <input
              type="number"
              name="passingScore"
              value={formData.passingScore}
              onChange={handleInputChange}
              min="0"
              max="100"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Максимальное количество попыток:
            </label>
            <input
              type="number"
              name="maxAttempts"
              value={formData.maxAttempts}
              onChange={handleInputChange}
              min="1"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Лимит времени (мин):
            </label>
            <input
              type="number"
              name="timeLimit"
              value={formData.timeLimit}
              onChange={handleInputChange}
              min="0"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Инструкции:
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={4}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                resize: "vertical",
              }}
              placeholder="Инструкции для выполнения задания..."
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            name="isPublished"
            checked={formData.isPublished}
            onChange={handleInputChange}
          />
          <span style={{ fontWeight: "bold" }}>
            {element.type === "lesson" ? "Опубликован" : "Опубликована"}
          </span>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: saveSuccess ? "#4caf50" : "#2196f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isSaving ? "not-allowed" : "pointer",
          opacity: isSaving ? 0.7 : 1,
          transition: "background-color 0.3s",
        }}
      >
        {isSaving ? "Сохранение..." : saveSuccess ? "✓ Сохранено" : "Сохранить изменения"}
      </button>
    </div>
  );
};

export default ElementPropertiesEditor;
