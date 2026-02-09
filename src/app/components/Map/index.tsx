"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./index.module.scss";

import ElementPropertiesEditor from "@/app/components/ElementPropertiesEditor";
import { MapService } from "@/app/http/mapService";
import type { CreateMapElementRequest, MapElementResponse } from "@/app/http/types/map";

interface Position {
  x: number;
  y: number;
}

interface MapElement {
  id: string;
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
  breakpoints?: {
    [breakpoint: string]: {
      hidden?: boolean;
      positioning?: "left" | "center" | "right" | "free";
      offset?: Position;
    };
  };
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

interface SaveState {
  isSaving: boolean;
  isSuccess: boolean;
  error?: string;
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

  const [dragStart, setDragStart] = useState<{
    position: Position;
    type: "resize" | "element";
    elementStart?: Position;
    elementType?: "free" | "fixed";
  } | null>(null);

  const [mapId, setMapId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log(isLoading, error);
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    isSuccess: false,
  });

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const emojis = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🥸",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "😖",
    "😫",
    "😩",
    "🥺",
    "😢",
    "😭",
    "😤",
    "😠",
    "😡",
    "🤬",
    "🤯",
    "😳",
    "🥵",
    "🥶",
    "😱",
    "😨",
    "😰",
    "😥",
    "😓",
    "🤗",
    "🤔",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😬",
    "🙄",
    "😯",
    "😦",
    "😧",
    "😮",
    "😲",
    "🥱",
    "😴",
    "🤤",
    "😪",
    "😵",
    "🤐",
    "🥴",
    "🤢",
    "🤮",
    "🤧",
    "😷",
    "🤒",
    "🤕",
    "🤑",
    "🤠",
  ];

  // Вспомогательные функции для получения значений по умолчанию
  const getDefaultWidth = (type: MapElement["type"]): number => {
    switch (type) {
      case "circle":
        return 40;

      case "image":
        return 60;

      case "checkpoint":
        return 40;

      case "lesson":
        return 60;

      case "emoji":
        return 40;

      case "text":
        return 200;

      default:
        return 40;
    }
  };

  const getDefaultHeight = (type: MapElement["type"]): number => {
    switch (type) {
      case "circle":
        return 40;

      case "image":
        return 60;

      case "checkpoint":
        return 40;

      case "lesson":
        return 60;

      case "emoji":
        return 40;

      case "text":
        return 20; // Для текста возвращаем число, а не строку

      default:
        return 40;
    }
  };

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
        id: element.id,
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
      type: element.type,
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
        type: type,
        positionX: 50,
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
          elementData.text = `Описание урока ${elements.filter((el) => el.type === "lesson").length + 1}`;
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
          elementData.title = `Контрольная точка ${elements.filter((el) => el.type === "checkpoint").length + 1}`;
          elementData.text = `Описание контрольной точки ${elements.filter((el) => el.type === "checkpoint").length + 1}`;
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
        id: serverElement.id,
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

  // Обновление элемента карты
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

      console.log("🔄 Обновление элемента карты с ID:", elementId);
      await MapService.updateMapElement(elementId, elementData);

      // Обновляем локальное состояние
      setElements((prev) => prev.map((el) => (el.id === elementId ? updatedElement : el)));

      console.log("✅ Элемент карты обновлен:", elementId);
    } catch (error: any) {
      console.error("❌ Ошибка обновления элемента карты:", elementId, error);

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
  const addEmoji = (emoji: string) => createElement("emoji", { emoji });

  // Обновление свойства выбранного элемента карты
  const updateSelectedElementProperty = (property: string, value: any) => {
    if (!selectedElementId) return;

    updateElement(selectedElementId, { [property]: value });
  };

  // Обработка загрузки изображения для элемента
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        if (selectedElement && selectedElement.type === "image" && event.target?.result) {
          updateSelectedElementProperty("imageUrl", event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag & Drop для элементов
  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(elementId);

    const element = elements.find((el) => el.id === elementId);

    if (!element) return;

    setDragStart({
      position: { x: e.clientX, y: e.clientY },
      type: "element",
      elementStart: element.position,
      elementType: "free",
    });
  };

  const handleElementDragMove = useCallback(
    (e: MouseEvent) => {
      if (
        !dragStart ||
        dragStart.type !== "element" ||
        !selectedElementId ||
        !dragStart.elementStart
      )
        return;

      const element = elements.find((el) => el.id === selectedElementId);

      if (!element) return;

      const deltaX = e.clientX - dragStart.position.x;
      const deltaY = e.clientY - dragStart.position.y;

      // Для свободного позиционирования - плавное перемещение
      const newPosition = {
        x: Math.max(0, Math.min(100, dragStart.elementStart.x + (deltaX / mapSize.width) * 100)),
        y: Math.max(0, Math.min(100, dragStart.elementStart.y + (deltaY / mapSize.height) * 100)),
      };

      // Обновляем локальное состояние
      setElements((prev) =>
        prev.map((el) => (el.id === selectedElementId ? { ...el, position: newPosition } : el))
      );
    },
    [dragStart, selectedElementId, elements, mapSize]
  );

  const handleElementDragEnd = useCallback(() => {
    if (!dragStart || dragStart.type !== "element" || !selectedElementId) return;

    // Сохраняем изменения на сервере
    const element = elements.find((el) => el.id === selectedElementId);

    if (element) {
      updateElement(selectedElementId, { position: element.position });
    }

    setDragStart(null);
  }, [dragStart, selectedElementId, elements]);

  // Эффекты для обработки событий мыши
  useEffect(() => {
    if (dragStart) {
      if (dragStart.type === "element") {
        document.addEventListener("mousemove", handleElementDragMove);
        document.addEventListener("mouseup", handleElementDragEnd);
      }

      return () => {
        document.removeEventListener("mousemove", handleElementDragMove);
        document.removeEventListener("mouseup", handleElementDragEnd);
      };
    }
  }, [dragStart, handleElementDragMove, handleElementDragEnd]);

  // Рендер элемента
  const renderElement = (
    element: MapElement,
    targetMapSize: MapSize = mapSize,
    isEmulator: boolean = false
  ) => {
    const isSelected = element.id === selectedElementId && !isEmulator;

    // Расчет позиции элемента
    const position = { x: element.position.x, y: element.position.y };

    if (element.positioning === "free") {
      position.x = (element.position.x / 100) * targetMapSize.width;
      position.y = (element.position.y / 100) * targetMapSize.height;
    }

    const style = {
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
    };

    switch (element.type) {
      case "circle":
        return (
          <div
            key={element.id}
            className={`${styles.elementCircle} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
              backgroundColor: element.color || "#ff6b6b",
              width: element.width || 40,
              height: element.height || 40,
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          />
        );

      case "image":
        return (
          <div
            key={element.id}
            className={`${styles.imageContainer} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
              width: element.width || 60,
              height: element.height || 60,
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          >
            {element.imageUrl ? (
              <img
                src={element.imageUrl}
                alt="Element"
                className={styles.elementImage}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className={styles.imagePlaceholder}>Изображение</div>
            )}
          </div>
        );

      case "lesson":
        return (
          <div
            key={element.id}
            className={`${styles.lessonContainer} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          >
            <div
              className={`${styles.lessonCircle} ${element.isActive ? styles.lessonActive : ""}`}
            >
              {element.title?.charAt(0) || "У"}
            </div>
            <div className={styles.starsArc}>
              {[1, 2, 3].map((star) => (
                <div
                  key={star}
                  className={`${styles.star} ${star <= (element.stars || 0) ? styles.starFilled : ""}`}
                />
              ))}
            </div>
            <div className={styles.lessonTitle}>{element.title}</div>
          </div>
        );

      case "text":
        return (
          <div
            key={element.id}
            className={`${styles.textElement} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || "Arial, sans-serif",
              fontWeight: element.fontWeight || "normal",
              fontStyle: element.fontStyle || "normal",
              color: element.color || "#000000",
              width: element.width || "auto",
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          >
            {element.text}
          </div>
        );

      case "checkpoint":
        return (
          <div
            key={element.id}
            className={`${styles.checkpointContainer} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          >
            <div
              className={styles.checkpointElement}
              style={{
                backgroundColor: element.color || "#ff0000",
                width: element.width || 40,
                height: element.height || 40,
              }}
            >
              <div className={styles.checkpointInner}></div>
            </div>
            <div className={styles.checkpointTitle}>{element.title}</div>
          </div>
        );

      case "emoji":
        return (
          <div
            key={element.id}
            className={`${styles.emojiElement} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
              fontSize: element.fontSize || 40,
              width: element.width || 40,
              height: element.height || 40,
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          >
            {element.emoji}
          </div>
        );

      default:
        return null;
    }
  };

  // Сохранение карты
  const saveMap = async () => {
    try {
      setSaveState({ isSaving: true, isSuccess: false, error: undefined });

      if (!mapId) {
        throw new Error("Карта не загружена");
      }

      // Обновляем настройки карты
      await MapService.updateCourseMap(mapId, {
        width: mapSize.width,
        height: mapSize.height,
        backgroundColor: mapBackground.color,
        backgroundImage: mapBackground.image,
        backgroundRepeat: mapBackground.repeat,
        backgroundSize: mapBackground.size,
      });

      setSaveState({ isSaving: false, isSuccess: true, error: undefined });
      console.log("✅ Карта сохранена");
    } catch (error: any) {
      console.error("❌ Ошибка сохранения карты:", error);
      setSaveState({
        isSaving: false,
        isSuccess: false,
        error: error.message || "Ошибка при сохранении карты",
      });
    }
  };

  // Стили для фона карты
  const mapBackgroundStyle = {
    backgroundColor: mapBackground.color,
    backgroundImage: mapBackground.image ? `url(${mapBackground.image})` : "none",
    backgroundRepeat: mapBackground.repeat as any,
    backgroundSize: mapBackground.size as any,
  };

  // Type guard для проверки типа элемента
  const isElementType = (element: MapElement, type: MapElement["type"]): boolean => {
    return element.type === type;
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.globalStyle} />

      {/* Основной интерфейс */}
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
            <h3 className={styles.sectionTitle}>Смайлики</h3>
            <div className={styles.emojiGrid}>
              {emojis.slice(0, 20).map((emoji, index) => (
                <button
                  key={index}
                  className={styles.emojiButton}
                  onClick={() => addEmoji(emoji)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panelSection}>
            <h3 className={styles.sectionTitle}>Фон карты</h3>
            <div className={styles.propertyGroup}>
              <label className={styles.propertyLabel}>Цвет фона</label>
              <input
                className={styles.colorInput}
                type="color"
                value={mapBackground.color}
                onChange={(e) => setMapBackground((prev) => ({ ...prev, color: e.target.value }))}
              />
            </div>
            <div className={styles.propertyGroup}>
              <label className={styles.propertyLabel}>Фоновое изображение</label>
              <input
                type="file"
                ref={backgroundFileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();

                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setMapBackground((prev) => ({
                          ...prev,
                          image: event.target!.result as string,
                        }));
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                accept="image/*"
                style={{ display: "none" }}
              />
              <button
                className={styles.uploadButton}
                onClick={() => backgroundFileInputRef.current?.click()}
              >
                Выбрать изображение
              </button>
              {mapBackground.image && (
                <div className={styles.imagePreviewContainer}>
                  <img src={mapBackground.image} alt="Фон" className={styles.backgroundPreview} />
                  <button
                    className={styles.removeImageButton}
                    onClick={() => setMapBackground((prev) => ({ ...prev, image: undefined }))}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Основное содержимое */}
        <div className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <div
              className={`${styles.mapContainer} ${styles.centered}`}
              style={{
                width: mapSize.width,
                height: "auto",
                minHeight: mapSize.height,
                ...mapBackgroundStyle,
              }}
            >
              <div
                className={styles.mapContent}
                style={{ width: mapSize.width, height: mapSize.height }}
              >
                {elements.map((element) => renderElement(element, mapSize, false))}
              </div>
            </div>
            <div className={styles.sizeInfo}>
              Размер карты: {mapSize.width} × {mapSize.height}px | Элементов: {elements.length} |
              Курс: {courseId?.substring(0, 20)}...
            </div>
          </div>
        </div>

        {/* Правая панель свойств */}
        <div className={styles.rightPanel}>
          {selectedElement ? (
            <>
              {/* Используем type guard для проверки типа */}
              {isElementType(selectedElement, "lesson") ||
              isElementType(selectedElement, "checkpoint") ? (
                <ElementPropertiesEditor
                  element={selectedElement}
                  onUpdate={() => {
                    // Перезагружаем карту для обновления данных
                    loadCourseMap();
                    console.log("✅ Свойства элемента обновлены");
                  }}
                />
              ) : (
                <>
                  <h3 className={styles.sectionTitle}>Свойства элемента</h3>

                  {/* Общие свойства для всех элементов */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Название</label>
                    <input
                      className={styles.propertyInput}
                      type="text"
                      value={selectedElement.title || ""}
                      onChange={(e) => updateSelectedElementProperty("title", e.target.value)}
                    />
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Позиция X (%)</label>
                    <input
                      type="number"
                      className={styles.propertyInput}
                      value={selectedElement.position.x}
                      onChange={(e) =>
                        updateSelectedElementProperty("position", {
                          ...selectedElement.position,
                          x: parseFloat(e.target.value),
                        })
                      }
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Позиция Y (%)</label>
                    <input
                      type="number"
                      className={styles.propertyInput}
                      value={selectedElement.position.y}
                      onChange={(e) =>
                        updateSelectedElementProperty("position", {
                          ...selectedElement.position,
                          y: parseFloat(e.target.value),
                        })
                      }
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  {/* Специфичные свойства для кружков */}
                  {isElementType(selectedElement, "circle") && (
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Цвет</label>
                      <input
                        className={styles.colorInput}
                        type="color"
                        value={selectedElement.color || "#ff6b6b"}
                        onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                      />
                    </div>
                  )}

                  {/* Специфичные свойства для картинок */}
                  {isElementType(selectedElement, "image") && (
                    <>
                      <div className={styles.propertyGroup}>
                        <label className={styles.propertyLabel}>Изображение</label>
                        <input
                          type="file"
                          ref={imageFileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          style={{ display: "none" }}
                        />
                        <button
                          className={styles.uploadButton}
                          onClick={() => imageFileInputRef.current?.click()}
                        >
                          Выбрать изображение
                        </button>
                        {selectedElement.imageUrl && (
                          <div className={styles.imagePreviewContainer}>
                            <img
                              src={selectedElement.imageUrl}
                              alt="Preview"
                              className={styles.imagePreview}
                            />
                            <button
                              className={styles.removeImageButton}
                              onClick={() => updateSelectedElementProperty("imageUrl", "")}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Специфичные свойства для текста */}
                  {isElementType(selectedElement, "text") && (
                    <>
                      <div className={styles.propertyGroup}>
                        <label className={styles.propertyLabel}>Текст</label>
                        <textarea
                          className={styles.propertyTextarea}
                          value={selectedElement.text || ""}
                          onChange={(e) => updateSelectedElementProperty("text", e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className={styles.propertyGroup}>
                        <label className={styles.propertyLabel}>Цвет текста</label>
                        <input
                          className={styles.colorInput}
                          type="color"
                          value={selectedElement.color || "#000000"}
                          onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                        />
                      </div>
                      <div className={styles.propertyGroup}>
                        <label className={styles.propertyLabel}>Размер шрифта</label>
                        <input
                          type="number"
                          className={styles.propertyInput}
                          value={selectedElement.fontSize || 16}
                          onChange={(e) =>
                            updateSelectedElementProperty("fontSize", parseInt(e.target.value))
                          }
                          min="8"
                          max="72"
                        />
                      </div>
                    </>
                  )}

                  {/* Специфичные свойства для уроков */}
                  {isElementType(selectedElement, "lesson") && (
                    <>
                      <div className={styles.propertyGroup}>
                        <label className={styles.propertyLabel}>Звезды</label>
                        <select
                          className={styles.propertySelect}
                          value={selectedElement.stars || 0}
                          onChange={(e) =>
                            updateSelectedElementProperty("stars", parseInt(e.target.value))
                          }
                        >
                          <option value={0}>0 звезд</option>
                          <option value={1}>1 звезда</option>
                          <option value={2}>2 звезды</option>
                          <option value={3}>3 звезды</option>
                        </select>
                      </div>

                      <div className={styles.propertyGroup}>
                        <label className={styles.propertyLabel}>Статус</label>
                        <select
                          className={styles.propertySelect}
                          value={selectedElement.isActive ? "active" : "inactive"}
                          onChange={(e) =>
                            updateSelectedElementProperty("isActive", e.target.value === "active")
                          }
                        >
                          <option value="active">Активный</option>
                          <option value="inactive">Неактивный</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Специфичные свойства для контрольных точек */}
                  {isElementType(selectedElement, "checkpoint") && (
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Цвет</label>
                      <input
                        className={styles.colorInput}
                        type="color"
                        value={selectedElement.color || "#ff0000"}
                        onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                      />
                    </div>
                  )}

                  {/* Специфичные свойства для эмодзи */}
                  {isElementType(selectedElement, "emoji") && (
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер эмодзи</label>
                      <input
                        type="number"
                        className={styles.propertyInput}
                        value={selectedElement.fontSize || 40}
                        onChange={(e) =>
                          updateSelectedElementProperty("fontSize", parseInt(e.target.value))
                        }
                        min="16"
                        max="100"
                      />
                    </div>
                  )}

                  {/* Общие свойства размера - исправленная проверка типов */}
                  {(isElementType(selectedElement, "circle") ||
                    isElementType(selectedElement, "image") ||
                    isElementType(selectedElement, "checkpoint")) && (
                    <div className={styles.propertyGroupRow}>
                      <div className={styles.propertyGroupHalf}>
                        <label className={styles.propertyLabel}>Ширина</label>
                        <input
                          type="number"
                          className={styles.propertyInput}
                          value={selectedElement.width || getDefaultWidth(selectedElement.type)}
                          onChange={(e) =>
                            updateSelectedElementProperty("width", parseInt(e.target.value))
                          }
                          min="10"
                        />
                      </div>
                      <div className={styles.propertyGroupHalf}>
                        <label className={styles.propertyLabel}>Высота</label>
                        <input
                          type="number"
                          className={styles.propertyInput}
                          value={selectedElement.height || getDefaultHeight(selectedElement.type)}
                          onChange={(e) =>
                            updateSelectedElementProperty("height", parseInt(e.target.value))
                          }
                          min="10"
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Поворот (градусы)</label>
                    <input
                      type="number"
                      className={styles.propertyInput}
                      value={selectedElement.rotation || 0}
                      onChange={(e) =>
                        updateSelectedElementProperty("rotation", parseInt(e.target.value))
                      }
                      min="0"
                      max="360"
                    />
                  </div>

                  <button
                    className={`${styles.elementButton} ${styles.saveButton}`}
                    onClick={() => updateElement(selectedElement.id, selectedElement)}
                  >
                    Сохранить изменения элемента
                  </button>

                  <button
                    className={`${styles.elementButton} ${styles.deleteButton}`}
                    onClick={() => deleteElement(selectedElement.id)}
                  >
                    Удалить элемент
                  </button>
                </>
              )}
            </>
          ) : (
            <h3 className={styles.sectionTitle}>Выберите элемент</h3>
          )}
        </div>
      </div>

      {/* Кнопка сохранения карты */}
      <div className={styles.saveControls}>
        <button
          className={`${styles.saveButton} ${saveState.isSuccess ? styles.success : ""}`}
          onClick={saveMap}
          disabled={saveState.isSaving || !mapId}
        >
          {saveState.isSaving ? (
            <>
              <span className={styles.spinner}></span>
              Сохранение карты...
            </>
          ) : saveState.isSuccess ? (
            <>
              <span className={styles.checkmark}>✓</span>
              Карта сохранена
            </>
          ) : (
            "Сохранить настройки карты"
          )}
        </button>

        {saveState.error && <div className={styles.errorMessage}>{saveState.error}</div>}
      </div>
    </div>
  );
};

export default Map;
