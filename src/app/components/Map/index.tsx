"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import styles from "./index.module.scss";

// Типы
interface Position {
  x: number;
  y: number;
}

interface Element {
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

interface Breakpoint {
  name: string;
  width: number;
  height: number;
}

interface Device {
  name: string;
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
  const [mapSize, setMapSize] = useState<MapSize>({ width: 800, height: 600 });
  const [mapBackground, setMapBackground] = useState<MapBackground>({
    color: "#ffffff",
    repeat: "no-repeat",
    size: "cover",
  });
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<"right" | "bottom" | null>(null);
  const [dragStart, setDragStart] = useState<{
    position: Position;
    type: "resize" | "element";
    elementStart?: Position;
    elementType?: "free" | "fixed";
  } | null>(null);
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>("desktop");
  const [showEmulator, setShowEmulator] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Брейкпоинты
  const breakpoints: Breakpoint[] = [
    { name: "desktop", width: 1200, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  // Устройства для эмуляции
  const devices: Device[] = [
    { name: "iPhone 12", width: 390, height: 844 },
    { name: "iPad Air", width: 820, height: 1180 },
    { name: "Samsung Galaxy", width: 360, height: 740 },
    { name: "Desktop", width: 1200, height: 800 },
  ];

  // Стандартные смайлики
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

  // Функция для получения настроек элемента для текущего брейкпоинта
  const getElementBreakpointSettings = (element: Element) => {
    if (!element.breakpoints || !element.breakpoints[activeBreakpoint]) {
      return {};
    }

    return element.breakpoints[activeBreakpoint];
  };

  // Функция для вычисления позиции элемента с учетом брейкпоинта и размера карты
  const calculateElementPosition = (element: Element, targetMapSize: MapSize): Position => {
    const breakpointSettings = getElementBreakpointSettings(element);
    const isHidden = breakpointSettings.hidden;

    if (isHidden) {
      return { x: -1000, y: -1000 };
    }

    const currentPositioning = breakpointSettings.positioning || element.positioning;
    const currentOffset = breakpointSettings.offset || element.offset;

    const basePosition = { x: 0, y: 0 };

    switch (currentPositioning) {
      case "left":
        basePosition.x = currentOffset.x;
        break;

      case "center":
        basePosition.x = targetMapSize.width / 2 + currentOffset.x;
        break;

      case "right":
        basePosition.x = targetMapSize.width + currentOffset.x;
        break;

      case "free":
        basePosition.x = (element.position.x / 100) * targetMapSize.width;
        basePosition.y = (element.position.y / 100) * targetMapSize.height;
        break;
    }

    if (currentPositioning !== "free") {
      basePosition.y = currentOffset.y;
    }

    return basePosition;
  };

  // Добавление элементов
  const addCircle = () => {
    const newElement: Element = {
      id: `circle-${Date.now()}`,
      type: "circle",
      color: "#ff6b6b",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
      width: 40,
      height: 40,
      rotation: 0,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addImage = () => {
    const newElement: Element = {
      id: `image-${Date.now()}`,
      type: "image",
      imageUrl: "",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
      width: 60,
      height: 60,
      rotation: 0,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addLesson = () => {
    const isFirstLesson = elements.filter((el) => el.type === "lesson").length === 0;
    const newElement: Element = {
      id: `lesson-${Date.now()}`,
      type: "lesson",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
      title: `Урок ${elements.filter((el) => el.type === "lesson").length + 1}`,
      isActive: isFirstLesson,
      stars: isFirstLesson ? 3 : 0,
      width: 60,
      height: 60,
      rotation: 0,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addText = () => {
    const newElement: Element = {
      id: `text-${Date.now()}`,
      type: "text",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
      text: "Новый текст",
      fontSize: 16,
      fontFamily: "Arial, sans-serif",
      fontWeight: "normal",
      fontStyle: "normal",
      color: "#000000",
      width: 200,
      rotation: 0,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addCheckpoint = () => {
    const newElement: Element = {
      id: `checkpoint-${Date.now()}`,
      type: "checkpoint",
      color: "#ff0000",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
      title: "Контрольная точка",
      width: 40,
      height: 40,
      rotation: 0,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addEmoji = (emoji: string) => {
    const newElement: Element = {
      id: `emoji-${Date.now()}`,
      type: "emoji",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
      emoji: emoji,
      fontSize: 40,
      width: 40,
      height: 40,
      rotation: 0,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  // Обработка загрузки изображения для элемента
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        if (selectedElement && selectedElement.type === "image" && event.target?.result) {
          updateElementProperty("imageUrl", event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Обработка загрузки фонового изображения
  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          setMapBackground((prev) => ({ ...prev, image: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Управление брейкпоинтами
  const updateElementBreakpointSetting = (elementId: string, setting: string, value: any) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === elementId) {
          const breakpoints = { ...el.breakpoints };

          if (!breakpoints[activeBreakpoint]) {
            breakpoints[activeBreakpoint] = {};
          }

          breakpoints[activeBreakpoint] = {
            ...breakpoints[activeBreakpoint],
            [setting]: value,
          };

          return { ...el, breakpoints };
        }

        return el;
      })
    );
  };

  const resetBreakpointSettings = (elementId: string) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === elementId) {
          const breakpoints = { ...el.breakpoints };

          delete breakpoints[activeBreakpoint];

          return { ...el, breakpoints };
        }

        return el;
      })
    );
  };

  // Обработчики изменения размера карты
  const handleResizeStart = (direction: "right" | "bottom") => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(direction);
    setDragStart({
      position: { x: e.clientX, y: e.clientY },
      type: "resize",
    });
  };

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !dragStart || dragStart.type !== "resize") return;

      if (isResizing === "right") {
        const deltaX = e.clientX - dragStart.position.x;

        setMapSize((prev) => ({
          ...prev,
          width: Math.max(400, prev.width + deltaX),
        }));
      } else if (isResizing === "bottom") {
        const deltaY = e.clientY - dragStart.position.y;

        setMapSize((prev) => ({
          ...prev,
          height: Math.max(300, prev.height + deltaY),
        }));
      }

      setDragStart({
        position: { x: e.clientX, y: e.clientY },
        type: "resize",
      });
    },
    [isResizing, dragStart]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null);
    setDragStart(null);
  }, []);

  // Обработчики для элементов
  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(elementId);
    const element = elements.find((el) => el.id === elementId);

    if (element) {
      const breakpointSettings = getElementBreakpointSettings(element);
      const currentPositioning = breakpointSettings.positioning || element.positioning;
      const currentOffset = breakpointSettings.offset || element.offset;

      setDragStart({
        position: { x: e.clientX, y: e.clientY },
        type: "element",
        elementStart: currentPositioning === "free" ? element.position : currentOffset,
        elementType: currentPositioning === "free" ? "free" : "fixed",
      });
    }
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

      setElements((prev) =>
        prev.map((el) => {
          if (el.id === selectedElementId) {
            const breakpointSettings = getElementBreakpointSettings(el);
            //     const currentPositioning = breakpointSettings.positioning || el.positioning;

            if (dragStart.elementType === "free") {
              // Для свободного позиционирования - плавное перемещение
              const newPosition = {
                x: Math.max(
                  0,
                  Math.min(100, dragStart.elementStart!.x + (deltaX / mapSize.width) * 100)
                ),
                y: Math.max(
                  0,
                  Math.min(100, dragStart.elementStart!.y + (deltaY / mapSize.height) * 100)
                ),
              };

              return { ...el, position: newPosition };
            } else {
              // Для фиксированного позиционирования
              const newOffset = {
                x: dragStart.elementStart!.x + deltaX,
                y: dragStart.elementStart!.y + deltaY,
              };

              if (breakpointSettings && Object.keys(breakpointSettings).length > 0) {
                const breakpoints = { ...el.breakpoints };

                breakpoints[activeBreakpoint] = {
                  ...breakpoints[activeBreakpoint],
                  offset: newOffset,
                };

                return { ...el, breakpoints };
              } else {
                return { ...el, offset: newOffset };
              }
            }
          }

          return el;
        })
      );
    },
    [dragStart, selectedElementId, elements, mapSize, activeBreakpoint]
  );

  const handleElementDragEnd = useCallback(() => {
    setDragStart(null);
  }, []);

  // Эффекты для обработки событий мыши
  useEffect(() => {
    if (dragStart) {
      if (dragStart.type === "resize") {
        document.addEventListener("mousemove", handleResizeMove);
        document.addEventListener("mouseup", handleResizeEnd);
      } else if (dragStart.type === "element") {
        document.addEventListener("mousemove", handleElementDragMove);
        document.addEventListener("mouseup", handleElementDragEnd);
      }

      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mousemove", handleElementDragMove);
        document.removeEventListener("mouseup", handleResizeEnd);
        document.removeEventListener("mouseup", handleElementDragEnd);
      };
    }
  }, [dragStart, handleResizeMove, handleElementDragMove, handleResizeEnd, handleElementDragEnd]);

  // Обновление свойств элемента
  const updateElementProperty = (property: string, value: any) => {
    if (!selectedElementId) return;

    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, [property]: value } : el))
    );
  };

  // Рендер элемента в зависимости от типа
  const renderElement = (
    element: Element,
    targetMapSize: MapSize = mapSize,
    isEmulator: boolean = false
  ) => {
    const isSelected = element.id === selectedElementId && !isEmulator;
    const position = calculateElementPosition(element, targetMapSize);
    const breakpointSettings = getElementBreakpointSettings(element);
    const isHidden = breakpointSettings.hidden;
    const rotation = element.rotation || 0;

    const style = {
      left: position.x,
      top: position.y,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    };

    switch (element.type) {
      case "circle":
        return (
          <div
            key={element.id}
            className={`${styles.elementCircle} ${isSelected ? styles.elementSelected : ""}`}
            style={{
              ...style,
              backgroundColor: element.color,
              width: element.width || 40,
              height: element.height || 40,
              display: isHidden ? "none" : "block",
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
              display: isHidden ? "none" : "flex",
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          >
            {element.imageUrl ? (
              <img
                src={element.imageUrl}
                alt="Element"
                className={styles.elementImage}
                style={{
                  width: "100%",
                  height: "100%",
                }}
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
              display: isHidden ? "none" : "flex",
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
              display: isHidden ? "none" : "block",
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
              display: isHidden ? "none" : "flex",
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
              display: isHidden ? "none" : "flex",
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

  // Эмулятор
  const openEmulator = () => {
    setShowEmulator(true);
    setSelectedDevice(devices[0]);
  };

  const closeEmulator = () => {
    setShowEmulator(false);
    setSelectedDevice(null);
  };

  const handleDeviceChange = (device: Device) => {
    setSelectedDevice(device);
  };

  // Размер карты для отображения в эмуляторе
  const emulatorMapSize = selectedDevice
    ? {
        width: selectedDevice.width,
        height: Math.max(selectedDevice.height, 2000),
      }
    : { width: 800, height: 2000 };

  // Стили для фона карты
  const mapBackgroundStyle = {
    backgroundColor: mapBackground.color,
    backgroundImage: mapBackground.image ? `url(${mapBackground.image})` : "none",
    backgroundRepeat: mapBackground.repeat as any,
    backgroundSize: mapBackground.size as any,
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.globalStyle} />

      {/* Основной интерфейс */}
      {!showEmulator ? (
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
              <button
                className={styles.elementButton}
                onClick={() => document.getElementById("emoji-modal")?.classList.add(styles.show)}
              >
                Все смайлики
              </button>
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
                  onChange={handleBackgroundImageUpload}
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
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Повторение</label>
                <select
                  className={styles.propertySelect}
                  value={mapBackground.repeat}
                  onChange={(e) =>
                    setMapBackground((prev) => ({ ...prev, repeat: e.target.value }))
                  }
                >
                  <option value="no-repeat">Не повторять</option>
                  <option value="repeat">Повторять</option>
                  <option value="repeat-x">Повторять по X</option>
                  <option value="repeat-y">Повторять по Y</option>
                </select>
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Размер</label>
                <select
                  className={styles.propertySelect}
                  value={mapBackground.size}
                  onChange={(e) => setMapBackground((prev) => ({ ...prev, size: e.target.value }))}
                >
                  <option value="cover">Обложка</option>
                  <option value="contain">Вместить</option>
                  <option value="auto">Авто</option>
                </select>
              </div>
            </div>

            <div className={styles.breakpointsSection}>
              <h3 className={styles.sectionTitle}>Брейкпоинты</h3>
              {breakpoints.map((bp) => (
                <button
                  key={bp.name}
                  className={`${styles.breakpointButton} ${activeBreakpoint === bp.name ? styles.active : ""}`}
                  onClick={() => setActiveBreakpoint(bp.name)}
                >
                  {bp.name} ({bp.width}px)
                </button>
              ))}
              <button className={styles.elementButton} onClick={openEmulator}>
                Эмулятор
              </button>
            </div>
          </div>

          {/* Основное содержимое */}
          <div className={styles.mainContent}>
            <button className={styles.toggleButton} onClick={openEmulator}>
              Эмулятор
            </button>

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
                  <div
                    className={styles.resizeHandleRight}
                    onMouseDown={handleResizeStart("right")}
                  />
                  <div
                    className={styles.resizeHandleBottom}
                    onMouseDown={handleResizeStart("bottom")}
                  />
                </div>
              </div>
              <div className={styles.sizeInfo}>
                Размер карты: {mapSize.width} × {mapSize.height}px | Брейкпоинт: {activeBreakpoint}
              </div>
            </div>
          </div>

          {/* Правая панель свойств */}
          <div className={styles.rightPanel}>
            {selectedElement ? (
              <>
                <h3 className={styles.sectionTitle}>Свойства элемента</h3>

                <div className={styles.propertyGroup}>
                  <label className={styles.propertyLabel}>
                    Позиционирование ({activeBreakpoint})
                  </label>
                  <select
                    className={styles.propertySelect}
                    value={
                      getElementBreakpointSettings(selectedElement).positioning ||
                      selectedElement.positioning
                    }
                    onChange={(e) => {
                      if (activeBreakpoint === "desktop") {
                        updateElementProperty("positioning", e.target.value);
                      } else {
                        updateElementBreakpointSetting(
                          selectedElement.id,
                          "positioning",
                          e.target.value
                        );
                      }
                    }}
                  >
                    <option value="left">Слева</option>
                    <option value="center">По центру</option>
                    <option value="right">Справа</option>
                    <option value="free">Произвольно</option>
                  </select>
                </div>

                <div className={styles.propertyGroup}>
                  <label className={styles.propertyLabel}>Смещение ({activeBreakpoint})</label>
                  <div className={styles.offsetDisplay}>
                    X:{" "}
                    <span className={styles.offsetValue}>
                      {Math.round(
                        (
                          getElementBreakpointSettings(selectedElement).offset ||
                          selectedElement.offset
                        ).x
                      )}
                      px
                    </span>
                    <br />
                    Y:{" "}
                    <span className={styles.offsetValue}>
                      {Math.round(
                        (
                          getElementBreakpointSettings(selectedElement).offset ||
                          selectedElement.offset
                        ).y
                      )}
                      px
                    </span>
                  </div>
                </div>

                <div className={styles.propertyGroup}>
                  <label className={styles.propertyLabel}>Поворот</label>
                  <div className={styles.rotationControl}>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedElement.rotation || 0}
                      onChange={(e) => updateElementProperty("rotation", parseInt(e.target.value))}
                      className={styles.rotationSlider}
                    />
                    <span className={styles.rotationValue}>{selectedElement.rotation || 0}°</span>
                  </div>
                </div>

                {activeBreakpoint !== "desktop" && (
                  <div className={styles.breakpointPropertyGroup}>
                    <label className={styles.propertyLabel}>Настройки для {activeBreakpoint}</label>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>
                        <input
                          type="checkbox"
                          checked={!!getElementBreakpointSettings(selectedElement).hidden}
                          onChange={(e) =>
                            updateElementBreakpointSetting(
                              selectedElement.id,
                              "hidden",
                              e.target.checked
                            )
                          }
                        />
                        Скрыть элемент
                      </label>
                    </div>
                    <div className={styles.breakpointControls}>
                      <button
                        className={styles.smallButton}
                        onClick={() => resetBreakpointSettings(selectedElement.id)}
                      >
                        Сбросить
                      </button>
                    </div>
                  </div>
                )}

                {selectedElement.type === "circle" && (
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Цвет</label>
                    <input
                      className={styles.colorInput}
                      type="color"
                      value={selectedElement.color}
                      onChange={(e) => updateElementProperty("color", e.target.value)}
                    />
                    <div className={styles.sizeControl}>
                      <div className={styles.sizeRow}>
                        <label>Ширина:</label>
                        <input
                          type="number"
                          value={selectedElement.width || 40}
                          onChange={(e) => updateElementProperty("width", parseInt(e.target.value))}
                          className={styles.sizeInput}
                        />
                      </div>
                      <div className={styles.sizeRow}>
                        <label>Высота:</label>
                        <input
                          type="number"
                          value={selectedElement.height || 40}
                          onChange={(e) =>
                            updateElementProperty("height", parseInt(e.target.value))
                          }
                          className={styles.sizeInput}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedElement.type === "image" && (
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
                            onClick={() => updateElementProperty("imageUrl", "")}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер</label>
                      <div className={styles.sizeControl}>
                        <div className={styles.sizeRow}>
                          <label>Ширина:</label>
                          <input
                            type="number"
                            value={selectedElement.width || 60}
                            onChange={(e) =>
                              updateElementProperty("width", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                        <div className={styles.sizeRow}>
                          <label>Высота:</label>
                          <input
                            type="number"
                            value={selectedElement.height || 60}
                            onChange={(e) =>
                              updateElementProperty("height", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedElement.type === "lesson" && (
                  <>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Название урока</label>
                      <input
                        className={styles.propertyInput}
                        type="text"
                        value={selectedElement.title}
                        onChange={(e) => updateElementProperty("title", e.target.value)}
                      />
                    </div>

                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Звезды</label>
                      <select
                        className={styles.propertySelect}
                        value={selectedElement.stars}
                        onChange={(e) => updateElementProperty("stars", parseInt(e.target.value))}
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
                          updateElementProperty("isActive", e.target.value === "active")
                        }
                      >
                        <option value="active">Активный</option>
                        <option value="inactive">Неактивный</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedElement.type === "text" && (
                  <>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Текст</label>
                      <textarea
                        className={styles.textInput}
                        value={selectedElement.text}
                        onChange={(e) => updateElementProperty("text", e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Шрифт</label>
                      <select
                        className={styles.propertySelect}
                        value={selectedElement.fontFamily}
                        onChange={(e) => updateElementProperty("fontFamily", e.target.value)}
                      >
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="'Courier New', monospace">Courier New</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Verdana, sans-serif">Verdana</option>
                      </select>
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер шрифта</label>
                      <input
                        type="number"
                        className={styles.propertyInput}
                        value={selectedElement.fontSize}
                        onChange={(e) =>
                          updateElementProperty("fontSize", parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Цвет</label>
                      <input
                        className={styles.colorInput}
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) => updateElementProperty("color", e.target.value)}
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Начертание</label>
                      <div className={styles.fontStyleControls}>
                        <button
                          className={`${styles.fontStyleButton} ${selectedElement.fontWeight === "bold" ? styles.active : ""}`}
                          onClick={() =>
                            updateElementProperty(
                              "fontWeight",
                              selectedElement.fontWeight === "bold" ? "normal" : "bold"
                            )
                          }
                        >
                          Ж
                        </button>
                        <button
                          className={`${styles.fontStyleButton} ${selectedElement.fontStyle === "italic" ? styles.active : ""}`}
                          onClick={() =>
                            updateElementProperty(
                              "fontStyle",
                              selectedElement.fontStyle === "italic" ? "normal" : "italic"
                            )
                          }
                        >
                          К
                        </button>
                      </div>
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Ширина</label>
                      <input
                        type="number"
                        className={styles.propertyInput}
                        value={selectedElement.width}
                        onChange={(e) => updateElementProperty("width", parseInt(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {selectedElement.type === "checkpoint" && (
                  <>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Цвет</label>
                      <input
                        className={styles.colorInput}
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) => updateElementProperty("color", e.target.value)}
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Название</label>
                      <input
                        className={styles.propertyInput}
                        type="text"
                        value={selectedElement.title}
                        onChange={(e) => updateElementProperty("title", e.target.value)}
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер</label>
                      <div className={styles.sizeControl}>
                        <div className={styles.sizeRow}>
                          <input
                            type="number"
                            value={selectedElement.width || 40}
                            onChange={(e) => {
                              updateElementProperty("width", parseInt(e.target.value));
                              updateElementProperty("height", parseInt(e.target.value));
                            }}
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedElement.type === "emoji" && (
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Смайлик</label>
                    <div className={styles.emojiDisplay}>{selectedElement.emoji}</div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер</label>
                      <div className={styles.sizeControl}>
                        <div className={styles.sizeRow}>
                          <input
                            type="number"
                            value={selectedElement.fontSize || 40}
                            onChange={(e) =>
                              updateElementProperty("fontSize", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <h3 className={styles.sectionTitle}>Выберите элемент</h3>
            )}
          </div>
        </div>
      ) : (
        /* Эмулятор */
        <div className={styles.emulatorOverlay}>
          <div className={styles.emulatorContainer}>
            <button className={styles.closeButton} onClick={closeEmulator}>
              ×
            </button>
            <h3 className={styles.sectionTitle}>Эмулятор устройств</h3>

            <div className={styles.deviceSelector}>
              {devices.map((device) => (
                <button
                  key={device.name}
                  className={`${styles.deviceButton} ${selectedDevice?.name === device.name ? styles.active : ""}`}
                  onClick={() => handleDeviceChange(device)}
                >
                  {device.name}
                </button>
              ))}
            </div>

            {selectedDevice && (
              <div className={styles.contentWrapper}>
                <div
                  className={styles.emulatorScreen}
                  style={{
                    width: selectedDevice.width,
                    height: selectedDevice.height,
                  }}
                >
                  <div
                    className={`${styles.mapContainer} ${styles.centered}`}
                    style={{
                      width: selectedDevice.width,
                      height: emulatorMapSize.height,
                      ...mapBackgroundStyle,
                    }}
                  >
                    <div
                      className={styles.mapContent}
                      style={{ width: emulatorMapSize.width, height: emulatorMapSize.height }}
                    >
                      {elements.map((element) => renderElement(element, emulatorMapSize, true))}
                    </div>
                  </div>
                </div>
                <div className={styles.sizeInfo}>
                  Устройство: {selectedDevice.name}
                  <br />
                  Размер экрана: {selectedDevice.width} × {selectedDevice.height}px
                  <br />
                  Высота контента: {emulatorMapSize.height}px
                  <br />
                  Брейкпоинт: {activeBreakpoint}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно со смайликами */}
      <div id="emoji-modal" className={styles.emojiModal}>
        <div className={styles.emojiModalContent}>
          <button
            className={styles.closeButton}
            onClick={() => document.getElementById("emoji-modal")?.classList.remove(styles.show)}
          >
            ×
          </button>
          <h3 className={styles.sectionTitle}>Выберите смайлик</h3>
          <div className={styles.emojiModalGrid}>
            {emojis.map((emoji, index) => (
              <button
                key={index}
                className={styles.emojiModalButton}
                onClick={() => {
                  addEmoji(emoji);
                  document.getElementById("emoji-modal")?.classList.remove(styles.show);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
