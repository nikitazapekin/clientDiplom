"use client";

import React, { useCallback, useState } from "react";

import styles from "./index.module.scss";
//import Pencil from "@assets/icons/utils/pencil.png";

// Типы
interface Position {
  x: number;
  y: number;
}

interface Element {
  id: string;
  type: "circle" | "image" | "lesson";
  color?: string;
  position: Position;
  positioning: "left" | "center" | "right" | "free";
  offset: Position;
  imageUrl?: string;
  title?: string;
  isActive?: boolean;
  stars?: number;
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

const Map: React.FC = () => {
  const [mapSize, setMapSize] = useState<MapSize>({ width: 800, height: 600 });
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<"right" | "bottom" | null>(null);
  const [dragStart, setDragStart] = useState<{
    position: Position;
    type: "resize" | "element";
  } | null>(null);
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>("desktop");
  const [showEmulator, setShowEmulator] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Брейкпоинты
  const breakpoints: Breakpoint[] = [
    { name: "desktop", width: 1200, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  // Устройства для эмуляции (без масштабирования)
  const devices: Device[] = [
    { name: "iPhone 12", width: 390, height: 844 },
    { name: "iPad Air", width: 820, height: 1180 },
    { name: "Samsung Galaxy", width: 360, height: 740 },
    { name: "Desktop", width: 1200, height: 800 },
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
      return { x: -1000, y: -1000 }; // Скрываем элемент
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

    // Для вертикальной позиции всегда используем offset.y
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
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addImage = () => {
    const newElement: Element = {
      id: `image-${Date.now()}`,
      type: "image",
      imageUrl: "https://via.placeholder.com/60",
      position: { x: 50, y: 50 },
      positioning: "free",
      offset: { x: 0, y: 0 },
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
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
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
    setSelectedElementId(elementId);
    const element = elements.find((el) => el.id === elementId);

    if (element) {
      setDragStart({
        position: { x: e.clientX, y: e.clientY },
        type: "element",
      });
    }
  };

  const handleElementDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStart || dragStart.type !== "element" || !selectedElementId) return;

      const element = elements.find((el) => el.id === selectedElementId);

      if (!element) return;

      const deltaX = e.clientX - dragStart.position.x;
      const deltaY = e.clientY - dragStart.position.y;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id === selectedElementId) {
            const breakpointSettings = getElementBreakpointSettings(el);
            const currentPositioning = breakpointSettings.positioning || el.positioning;

            if (currentPositioning === "free") {
              // Для свободного позиционирования обновляем процентные координаты
              const newPosition = {
                x: Math.max(0, Math.min(100, el.position.x + (deltaX / mapSize.width) * 100)),
                y: Math.max(0, Math.min(100, el.position.y + (deltaY / mapSize.height) * 100)),
              };

              return { ...el, position: newPosition };
            } else {
              // Для фиксированного позиционирования обновляем offset
              const currentOffset = breakpointSettings.offset || el.offset;
              const newOffset = {
                x: currentOffset.x + deltaX,
                y: currentOffset.y + deltaY,
              };

              // Если есть настройки для текущего брейкпоинта, обновляем их
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

      setDragStart({
        position: { x: e.clientX, y: e.clientY },
        type: "element",
      });
    },
    [dragStart, selectedElementId, elements, mapSize, activeBreakpoint]
  );

  const handleElementDragEnd = useCallback(() => {
    setDragStart(null);
  }, []);

  // Эффекты для обработки событий мыши
  React.useEffect(() => {
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

    const style = {
      left: position.x,
      top: position.y,
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
              display: isHidden ? "none" : "block",
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          />
        );

      case "image":
        return (
          <img
            key={element.id}
            className={`${styles.elementImage} ${isSelected ? styles.elementSelected : ""}`}
            src={element.imageUrl}
            alt="Element"
            style={{
              ...style,
              display: isHidden ? "none" : "block",
            }}
            onMouseDown={isEmulator ? undefined : (e) => handleElementDragStart(element.id, e)}
          />
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
                Добавить кружок
              </button>
              <button className={styles.elementButton} onClick={addImage}>
                Добавить картинку
              </button>
              <button className={styles.elementButton} onClick={addLesson}>
                Добавить урок
              </button>
            </div>

            <div className={styles.panelSection}>
              <h3 className={styles.sectionTitle}>Декор</h3>
              <button className={styles.elementButton}>Фон</button>
              <button className={styles.elementButton}>Иконки</button>
              <button className={styles.elementButton}>Текстуры</button>
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
                Просмотр на эмуляторе
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
                style={{ width: mapSize.width, height: "auto", minHeight: mapSize.height }}
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
                  </div>
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
                      background: "white",
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
    </div>
  );
};

export default Map;
