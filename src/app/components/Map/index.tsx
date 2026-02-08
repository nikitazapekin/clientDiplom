"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./index.module.scss";

import { MapService } from "@/app/http/mapService";
import type {
  CreateMapElementRequest,
  MapElementResponse,
  MapElementType,
} from "@/app/http/types/map";

interface Position {
  x: number;
  y: number;
}

interface MapElement {
  id: string; // ТОЛЬКО СЕРВЕРНЫЙ ID!
  type: "circle" | "image" | "lesson" | "text" | "checkpoint" | "emoji";
  color?: string;
  position: Position;
  positioning: "left" | "center" | "right" | "free";
  offset: Position;
  imageUrl?: string;
  title?: string;
  isActive?: boolean;
  stars?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  width?: number;
  height?: number;
  rotation?: number;
  emoji?: string;
  breakpoints?: Record<string, any>;
}

interface MapSize {
  width: number;
  height: number;
}

interface MapBackground {
  color: string;
  image?: string;
  repeat?: string;
  size?: string;
}

const Map: React.FC = () => {
  const pathname = usePathname();

  const getCourseIdFromUrl = () => {
    if (!pathname) return null;

    const match = pathname.match(/\/courses\/(course_[^/]+)/);

    return match ? match[1] : null;
  };

  const courseId = getCourseIdFromUrl();

  const [mapSize, setMapSize] = useState<MapSize>({ width: 800, height: 600 });
  const [mapBackground, setMapBackground] = useState<MapBackground>({
    color: "#ffffff",
    repeat: "no-repeat",
    size: "cover",
  });
  const [elements, setElements] = useState<MapElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [mapId, setMapId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Загрузка карты при монтировании
  useEffect(() => {
    if (courseId) {
      loadCourseMap();
    }
  }, [courseId]);

  const loadCourseMap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Загрузка карты для курса:", courseId);

      const mapData = await MapService.getCourseMapByCourseId(courseId!);

      console.log("✅ Карта загружена. ID:", mapData.id, "Элементов:", mapData.elements.length);

      setMapId(mapData.id);
      setMapSize({ width: mapData.width, height: mapData.height });
      setMapBackground({
        color: mapData.backgroundColor,
        image: mapData.backgroundImage,
        repeat: mapData.backgroundRepeat,
        size: mapData.backgroundSize,
      });

      // Преобразуем элементы из серверного формата
      const loadedElements = mapData.elements.map((element: MapElementResponse) => ({
        id: element.id, // СЕРВЕРНЫЙ ID
        type: element.type as MapElement["type"],
        color: element.color,
        position: { x: element.positionX, y: element.positionY },
        positioning: element.positioning as MapElement["positioning"],
        offset: { x: element.offsetX, y: element.offsetY },
        imageUrl: element.imageUrl,
        title: element.title,
        isActive: element.isActive,
        stars: element.stars,
        text: element.text,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        width: element.width,
        height: element.height,
        rotation: element.rotation || 0,
        emoji: element.emoji,
        breakpoints: element.breakpoints,
      }));

      setElements(loadedElements);
      console.log(`✅ Загружено ${loadedElements.length} элементов с сервера`);
    } catch (error: any) {
      console.error("❌ Ошибка загрузки карты:", error);
      setError("Не удалось загрузить карту.");
    } finally {
      setIsLoading(false);
    }
  };

  // Преобразование элемента в формат API
  const convertElementToApiFormat = (element: MapElement): CreateMapElementRequest => {
    return {
      type: element.type as MapElementType,
      title: element.title,
      text: element.text,
      color: element.color,
      imageUrl: element.imageUrl,
      emoji: element.emoji,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      positionX: element.position.x,
      positionY: element.position.y,
      positioning: element.positioning,
      offsetX: element.offset.x,
      offsetY: element.offset.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation || 0,
      isActive: element.isActive,
      stars: element.stars,
      breakpoints: element.breakpoints,
    };
  };

  // Создание нового элемента
  const createElement = async (
    type: MapElement["type"],
    defaultProps: Partial<MapElement> = {}
  ) => {
    try {
      if (!mapId) {
        console.error("❌ Нет mapId для создания элемента");
        setError("Карта не загружена");

        return;
      }

      // Собираем данные для нового элемента
      const elementData: CreateMapElementRequest = {
        type: type as MapElementType,
        positionX: 50, // Позиция по умолчанию
        positionY: 50,
        positioning: "free",
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
      };

      // Добавляем специфичные для типа свойства
      switch (type) {
        case "circle":
          elementData.color = "#ff6b6b";
          elementData.width = 40;
          elementData.height = 40;
          break;

        case "image":
          elementData.width = 60;
          elementData.height = 60;
          break;

        case "lesson":
          elementData.title = `Урок ${elements.filter((el) => el.type === "lesson").length + 1}`;
          elementData.isActive = elements.filter((el) => el.type === "lesson").length === 0;
          elementData.stars = elements.filter((el) => el.type === "lesson").length === 0 ? 3 : 0;
          elementData.width = 60;
          elementData.height = 60;
          break;

        case "text":
          elementData.text = "Новый текст";
          elementData.fontSize = 16;
          elementData.fontFamily = "Arial, sans-serif";
          elementData.fontWeight = "normal";
          elementData.fontStyle = "normal";
          elementData.color = "#000000";
          elementData.width = 200;
          break;

        case "checkpoint":
          elementData.color = "#ff0000";
          elementData.title = "Контрольная точка";
          elementData.width = 40;
          elementData.height = 40;
          break;

        case "emoji":
          elementData.emoji = "😀";
          elementData.fontSize = 40;
          elementData.width = 40;
          elementData.height = 40;
          break;
      }

      // Применяем кастомные свойства
      Object.assign(elementData, defaultProps);

      console.log("🆕 Создание элемента на сервере...");
      const serverElement = await MapService.addMapElement(mapId, elementData);

      console.log("✅ Элемент создан на сервере с ID:", serverElement.id);

      // Преобразуем серверный элемент в формат клиента
      const newElement: MapElement = {
        id: serverElement.id, // СЕРВЕРНЫЙ ID
        type: serverElement.type as MapElement["type"],
        color: serverElement.color,
        position: { x: serverElement.positionX, y: serverElement.positionY },
        positioning: serverElement.positioning as MapElement["positioning"],
        offset: { x: serverElement.offsetX, y: serverElement.offsetY },
        imageUrl: serverElement.imageUrl,
        title: serverElement.title,
        isActive: serverElement.isActive,
        stars: serverElement.stars,
        text: serverElement.text,
        fontSize: serverElement.fontSize,
        fontFamily: serverElement.fontFamily,
        fontWeight: serverElement.fontWeight,
        fontStyle: serverElement.fontStyle,
        width: serverElement.width,
        height: serverElement.height,
        rotation: serverElement.rotation || 0,
        emoji: serverElement.emoji,
        breakpoints: serverElement.breakpoints,
      };

      // Добавляем элемент в состояние
      setElements((prev) => [...prev, newElement]);
      setSelectedElementId(serverElement.id);
    } catch (error: any) {
      console.error("❌ Ошибка создания элемента:", error);
      setError("Не удалось создать элемент: " + (error.message || "Неизвестная ошибка"));
    }
  };

  // Обновление элемента
  const updateElement = async (elementId: string, updates: Partial<MapElement>) => {
    try {
      const element = elements.find((el) => el.id === elementId);

      if (!element) {
        console.error("❌ Элемент не найден для обновления:", elementId);

        return;
      }

      // Создаем обновленный элемент
      const updatedElement = { ...element, ...updates };

      // Конвертируем в формат API
      const elementData = convertElementToApiFormat(updatedElement);

      console.log("🔄 Обновление элемента с ID:", elementId);
      await MapService.updateMapElement(elementId, elementData);

      // Обновляем локальное состояние
      setElements((prev) => prev.map((el) => (el.id === elementId ? updatedElement : el)));

      console.log("✅ Элемент обновлен:", elementId);
    } catch (error: any) {
      console.error("❌ Ошибка обновления элемента:", elementId, error);

      // Если элемент не найден (404), перезагружаем карту
      if (error.response?.status === 404) {
        console.log("🔄 Элемент не найден, перезагружаем карту...");
        loadCourseMap();
      }
    }
  };

  // Удаление элемента
  const deleteElement = async (elementId: string) => {
    try {
      console.log("🗑️ Удаление элемента с ID:", elementId);
      await MapService.deleteMapElement(elementId);

      // Удаляем из локального состояния
      setElements((prev) => prev.filter((el) => el.id !== elementId));

      if (selectedElementId === elementId) {
        setSelectedElementId(null);
      }

      console.log("✅ Элемент удален:", elementId);
    } catch (error: any) {
      console.error("❌ Ошибка удаления элемента:", elementId, error);

      // Если элемент не найден (404), все равно удаляем из локального состояния
      if (error.response?.status === 404) {
        console.log("ℹ️ Элемент не найден на сервере, удаляем локально");
        setElements((prev) => prev.filter((el) => el.id !== elementId));

        if (selectedElementId === elementId) {
          setSelectedElementId(null);
        }
      }
    }
  };

  // Функции добавления элементов
  const addCircle = () => createElement("circle");
  const addImage = () => createElement("image");
  const addLesson = () => createElement("lesson");
  const addText = () => createElement("text");
  const addCheckpoint = () => createElement("checkpoint");

  // Обновление свойства выбранного элемента
  const updateSelectedElementProperty = (property: string, value: any) => {
    if (!selectedElementId) return;

    updateElement(selectedElementId, { [property]: value });
  };

  // Drag & Drop
  const [dragStart, setDragStart] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    elementStartX: number;
    elementStartY: number;
  } | null>(null);

  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const element = elements.find((el) => el.id === elementId);

    if (!element) return;

    setSelectedElementId(elementId);
    setDragStart({
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      elementStartX: element.position.x,
      elementStartY: element.position.y,
    });
  };

  const handleElementDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStart) return;

      const deltaX = e.clientX - dragStart.startX;
      const deltaY = e.clientY - dragStart.startY;

      // Рассчитываем новую позицию в процентах
      const newPositionX = Math.max(
        0,
        Math.min(100, dragStart.elementStartX + (deltaX / mapSize.width) * 100)
      );
      const newPositionY = Math.max(
        0,
        Math.min(100, dragStart.elementStartY + (deltaY / mapSize.height) * 100)
      );

      // Обновляем локальное состояние
      setElements((prev) =>
        prev.map((el) =>
          el.id === dragStart.elementId
            ? { ...el, position: { x: newPositionX, y: newPositionY } }
            : el
        )
      );
    },
    [dragStart, mapSize]
  );

  const handleElementDragEnd = useCallback(() => {
    if (!dragStart) return;

    // Сохраняем изменения на сервере
    const element = elements.find((el) => el.id === dragStart.elementId);

    if (element) {
      updateElement(dragStart.elementId, { position: element.position });
    }

    setDragStart(null);
  }, [dragStart, elements]);

  useEffect(() => {
    if (dragStart) {
      document.addEventListener("mousemove", handleElementDragMove);
      document.addEventListener("mouseup", handleElementDragEnd);

      return () => {
        document.removeEventListener("mousemove", handleElementDragMove);
        document.removeEventListener("mouseup", handleElementDragEnd);
      };
    }
  }, [dragStart, handleElementDragMove, handleElementDragEnd]);

  // Рендер элемента
  const renderElement = (element: MapElement) => {
    const isSelected = element.id === selectedElementId;
    const left = (element.position.x / 100) * mapSize.width;
    const top = (element.position.y / 100) * mapSize.height;

    const commonStyle: React.CSSProperties = {
      position: "absolute",
      left: left,
      top: top,
      transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
      cursor: "move",
    };

    switch (element.type) {
      case "circle":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: element.color || "#ff6b6b",
              width: element.width || 40,
              height: element.height || 40,
              borderRadius: "50%",
              border: isSelected ? "2px solid #007bff" : "none",
            }}
            onMouseDown={(e: React.MouseEvent) => handleElementDragStart(element.id, e)}
          />
        );

      case "image":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              width: element.width || 60,
              height: element.height || 60,
              border: isSelected ? "2px solid #007bff" : "none",
              overflow: "hidden",
            }}
            onMouseDown={(e: React.MouseEvent) => handleElementDragStart(element.id, e)}
          >
            {element.imageUrl ? (
              <img
                src={element.imageUrl}
                alt="Element"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f5f5f5",
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                Изображение
              </div>
            )}
          </div>
        );

      case "text":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || "Arial, sans-serif",
              fontWeight: element.fontWeight || "normal",
              fontStyle: element.fontStyle || "normal",
              color: element.color || "#000000",
              width: element.width || "auto",
              padding: "4px",
              whiteSpace: "nowrap",
              backgroundColor: isSelected ? "rgba(0, 123, 255, 0.1)" : "transparent",
              border: isSelected ? "2px solid #007bff" : "none",
              borderRadius: "4px",
            }}
            onMouseDown={(e: React.MouseEvent) => handleElementDragStart(element.id, e)}
          >
            {element.text}
          </div>
        );

      case "lesson":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: isSelected ? "4px" : "0",
              border: isSelected ? "2px solid #007bff" : "none",
              borderRadius: "8px",
            }}
            onMouseDown={(e: React.MouseEvent) => handleElementDragStart(element.id, e)}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                backgroundColor: element.isActive ? "#28a745" : "#4a90e2",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              {element.title?.charAt(0) || "У"}
            </div>
            {element.stars && element.stars > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  display: "flex",
                  gap: "2px",
                }}
              >
                {[1, 2, 3].map((star) => (
                  <div
                    key={star}
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: star <= (element.stars || 0) ? "#ffd700" : "#ddd",
                      clipPath:
                        "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                    }}
                  />
                ))}
              </div>
            )}
            <div
              style={{
                marginTop: "5px",
                fontSize: "12px",
                color: "#333",
                textAlign: "center",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {element.title}
            </div>
          </div>
        );

      case "checkpoint":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: isSelected ? "4px" : "0",
              border: isSelected ? "2px solid #007bff" : "none",
              borderRadius: "8px",
            }}
            onMouseDown={(e: React.MouseEvent) => handleElementDragStart(element.id, e)}
          >
            <div
              style={{
                width: element.width || 40,
                height: element.height || 40,
                borderRadius: "50%",
                backgroundColor: element.color || "#ff0000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "50%",
                  height: "50%",
                  backgroundColor: "white",
                  borderRadius: "50%",
                }}
              />
            </div>
            <div
              style={{
                marginTop: "5px",
                fontSize: "12px",
                color: "#333",
                textAlign: "center",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {element.title}
            </div>
          </div>
        );

      case "emoji":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              fontSize: element.fontSize || 40,
              width: element.width || 40,
              height: element.height || 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isSelected ? "2px solid #007bff" : "none",
              borderRadius: "8px",
            }}
            onMouseDown={(e: React.MouseEvent) => handleElementDragStart(element.id, e)}
          >
            {element.emoji}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Загрузка карты...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "20px",
        }}
      >
        <div style={{ color: "red" }}>{error}</div>
        <button onClick={loadCourseMap}>Повторить попытку</button>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Курс не найден в URL
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.globalStyle} />

      <div className={styles.wrapperContainer}>
        {/* Левая панель */}
        <div className={styles.leftPanel}>
          <div className={styles.panelSection}>
            <h3 className={styles.sectionTitle}>Элементы</h3>
            <button className={styles.elementButton} onClick={addCircle}>
              Кружок
            </button>
            <button className={styles.elementButton} onClick={addImage}>
              Картинка
            </button>
            <button className={styles.elementButton} onClick={addLesson}>
              Урок
            </button>
            <button className={styles.elementButton} onClick={addText}>
              Текст
            </button>
            <button className={styles.elementButton} onClick={addCheckpoint}>
              Контрольная точка
            </button>

            {selectedElement && (
              <button
                className={`${styles.elementButton} ${styles.deleteButton}`}
                onClick={() => deleteElement(selectedElement.id)}
              >
                Удалить выбранный
              </button>
            )}
          </div>

          <div className={styles.panelSection}>
            <h3 className={styles.sectionTitle}>Информация</h3>
            <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.5" }}>
              <div>
                <strong>Элементов:</strong> {elements.length}
              </div>
              <div>
                <strong>Размер карты:</strong> {mapSize.width}×{mapSize.height}
              </div>
              {mapId && (
                <div>
                  <strong>ID карты:</strong> {mapId}
                </div>
              )}
              <div>
                <strong>Курс:</strong> {courseId}
              </div>
              {selectedElement && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  <div>
                    <strong>Выбран элемент:</strong>
                  </div>
                  <div>ID: {selectedElement.id}</div>
                  <div>Тип: {selectedElement.type}</div>
                  <div>
                    Позиция: {selectedElement.position.x.toFixed(1)}%,{" "}
                    {selectedElement.position.y.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Основное содержимое */}
        <div className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <div
              className={styles.mapContainer}
              style={{
                width: mapSize.width,
                height: mapSize.height,
                backgroundColor: mapBackground.color,
                backgroundImage: mapBackground.image ? `url(${mapBackground.image})` : "none",
                backgroundRepeat: mapBackground.repeat as any,
                backgroundSize: mapBackground.size as any,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {elements.map((element) => renderElement(element))}
            </div>
            <div
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: "#666",
                textAlign: "center",
              }}
            >
              Перетаскивайте элементы мышкой | Двойной клик для редактирования
            </div>
          </div>
        </div>

        {/* Правая панель свойств */}
        <div className={styles.rightPanel}>
          {selectedElement ? (
            <>
              <h3 className={styles.sectionTitle}>Свойства элемента</h3>

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>ID элемента</label>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    wordBreak: "break-all",
                    padding: "5px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  {selectedElement.id}
                </div>
              </div>

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Позиция X (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={selectedElement.position.x.toFixed(1)}
                  onChange={(e) =>
                    updateSelectedElementProperty("position", {
                      ...selectedElement.position,
                      x: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={styles.propertyInput}
                />
              </div>

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Позиция Y (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={selectedElement.position.y.toFixed(1)}
                  onChange={(e) =>
                    updateSelectedElementProperty("position", {
                      ...selectedElement.position,
                      y: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={styles.propertyInput}
                />
              </div>

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Поворот (°)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={selectedElement.rotation || 0}
                  onChange={(e) =>
                    updateSelectedElementProperty("rotation", parseInt(e.target.value) || 0)
                  }
                  className={styles.propertyInput}
                />
              </div>

              {selectedElement.type === "circle" && (
                <div className={styles.propertyGroup}>
                  <label className={styles.propertyLabel}>Цвет</label>
                  <input
                    type="color"
                    value={selectedElement.color || "#ff6b6b"}
                    onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                    className={styles.colorInput}
                  />
                </div>
              )}

              {selectedElement.type === "text" && (
                <>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Текст</label>
                    <textarea
                      value={selectedElement.text || ""}
                      onChange={(e) => updateSelectedElementProperty("text", e.target.value)}
                      className={styles.propertyInput}
                      rows={3}
                    />
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Цвет текста</label>
                    <input
                      type="color"
                      value={selectedElement.color || "#000000"}
                      onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                      className={styles.colorInput}
                    />
                  </div>
                </>
              )}

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Ширина</label>
                <input
                  type="number"
                  value={selectedElement.width || ""}
                  onChange={(e) =>
                    updateSelectedElementProperty("width", parseInt(e.target.value) || undefined)
                  }
                  className={styles.propertyInput}
                />
              </div>

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Высота</label>
                <input
                  type="number"
                  value={selectedElement.height || ""}
                  onChange={(e) =>
                    updateSelectedElementProperty("height", parseInt(e.target.value) || undefined)
                  }
                  className={styles.propertyInput}
                />
              </div>

              <button
                className={`${styles.elementButton} ${styles.saveButton}`}
                onClick={() => updateElement(selectedElement.id, selectedElement)}
              >
                Сохранить изменения
              </button>

              <button
                className={`${styles.elementButton} ${styles.deleteButton}`}
                onClick={() => deleteElement(selectedElement.id)}
              >
                Удалить элемент
              </button>
            </>
          ) : (
            <h3 className={styles.sectionTitle}>Выберите элемент</h3>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;
