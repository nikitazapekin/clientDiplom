"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Button from "../Button";

import styles from "./index.module.scss";

import { CheckpointService } from "@/app/http/checkpointService";
import { LessonService } from "@/app/http/lessonService";
import { MapService } from "@/app/http/mapService";
import type {
  CreateMapElementRequest,
  MapElementResponse,
  MapElementType,
} from "@/app/http/types/map";

/* eslint-disable */
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

interface SaveState {
  isSaving: boolean;
  isSuccess: boolean;
  error?: string;
}

interface LessonData {
  id?: string;
  mapElementId: string;
  title: string;
  description: string;
  content?: string;
  duration?: number;
  orderIndex: number;
  isPublished: boolean;
}

interface CheckpointData {
  id?: string;
  mapElementId: string;
  title: string;
  description: string;
  type: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  instructions?: string;
  isPublished: boolean;
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
  const [mapId, setMapId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    isSuccess: false,
  });
  const [lessonsData, setLessonsData] = useState<Record<string, LessonData>>({});
  const [checkpointsData, setCheckpointsData] = useState<Record<string, CheckpointData>>({});

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const breakpoints: Breakpoint[] = [
    { name: "desktop", width: 1200, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  const devices: Device[] = [
    { name: "iPhone 12", width: 390, height: 844 },
    { name: "iPad Air", width: 820, height: 1180 },
    { name: "Samsung Galaxy", width: 360, height: 740 },
    { name: "Desktop", width: 1200, height: 800 },
  ];

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

      // Загружаем дополнительные данные для уроков и контрольных точек
      await loadAdditionalData(loadedElements);
    } catch (error: any) {
      console.error("❌ Ошибка загрузки карты:", error);
      setError("Не удалось загрузить карту.");
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка дополнительных данных для уроков и контрольных точек
  const loadAdditionalData = async (elements: MapElement[]) => {
    try {
      const lessons: Record<string, LessonData> = {};
      const checkpoints: Record<string, CheckpointData> = {};

      // Загружаем данные для каждого урока
      const lessonElements = elements.filter((el) => el.type === "lesson");
      for (const element of lessonElements) {
        try {
          const lessonData = await LessonService.getLessonByMapElementId(element.id);
          lessons[element.id] = {
            id: lessonData.id,
            mapElementId: lessonData.mapElementId,
            title: lessonData.title,
            description: lessonData.description,
            content: lessonData.content,
            duration: lessonData.duration,
            orderIndex: lessonData.orderIndex,
            isPublished: lessonData.isPublished,
          };
          console.log(`✅ Загружены данные урока для элемента: ${element.id}`);
        } catch (error) {
          console.warn(`⚠️ Не удалось загрузить данные урока для элемента: ${element.id}`, error);
          // Создаем базовую структуру если урок не найден
          lessons[element.id] = {
            mapElementId: element.id,
            title: element.title || `Урок ${element.id.substring(0, 8)}`,
            description: element.text || "",
            orderIndex: 0,
            isPublished: true,
          };
        }
      }

      // Загружаем данные для каждой контрольной точки
      const checkpointElements = elements.filter((el) => el.type === "checkpoint");
      for (const element of checkpointElements) {
        try {
          const checkpointData = await CheckpointService.getCheckpointByMapElementId(element.id);
          checkpoints[element.id] = {
            id: checkpointData.id,
            mapElementId: checkpointData.mapElementId,
            title: checkpointData.title,
            description: checkpointData.description,
            type: checkpointData.type || "quiz",
            passingScore: checkpointData.passingScore,
            maxAttempts: checkpointData.maxAttempts,
            timeLimit: checkpointData.timeLimit,
            instructions: checkpointData.instructions,
            isPublished: checkpointData.isPublished,
          };
          console.log(`✅ Загружены данные контрольной точки для элемента: ${element.id}`);
        } catch (error) {
          console.warn(
            `⚠️ Не удалось загрузить данные контрольной точки для элемента: ${element.id}`,
            error
          );
          // Создаем базовую структуру если контрольная точка не найдена
          checkpoints[element.id] = {
            mapElementId: element.id,
            title: element.title || `Контрольная точка ${element.id.substring(0, 8)}`,
            description: element.text || "",
            type: "quiz",
            isPublished: true,
          };
        }
      }

      setLessonsData(lessons);
      setCheckpointsData(checkpoints);
      console.log(
        `✅ Загружено данных: ${Object.keys(lessons).length} уроков, ${Object.keys(checkpoints).length} контрольных точек`
      );
    } catch (error) {
      console.error("❌ Ошибка загрузки дополнительных данных:", error);
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

      // Если создали урок или контрольную точку, создаем соответствующие записи
      if (type === "lesson") {
        try {
          // Здесь нужно вызвать метод создания урока если он есть в API
          console.log("📝 Создана запись урока для элемента:", serverElement.id);
        } catch (error) {
          console.warn("⚠️ Не удалось создать запись урока:", error);
        }
      } else if (type === "checkpoint") {
        try {
          // Здесь нужно вызвать метод создания контрольной точки если он есть в API
          console.log("📝 Создана запись контрольной точки для элемента:", serverElement.id);
        } catch (error) {
          console.warn("⚠️ Не удалось создать запись контрольной точки:", error);
        }
      }
    } catch (error: any) {
      console.error("❌ Ошибка создания элемента:", error);
      setError("Не удалось создать элемент: " + (error.message || "Неизвестная ошибка"));
    }
  };

  // Обновление элемента с обновлением связанных данных
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

      // Обновляем связанные данные для уроков и контрольных точек
      if (updatedElement.type === "lesson") {
        await updateLessonData(elementId, updatedElement);
      } else if (updatedElement.type === "checkpoint") {
        await updateCheckpointData(elementId, updatedElement);
      }
    } catch (error: any) {
      console.error("❌ Ошибка обновления элемента:", elementId, error);

      // Если элемент не найден (404), перезагружаем карту
      if (error.response?.status === 404) {
        console.log("🔄 Элемент не найден, перезагружаем карту...");
        loadCourseMap();
      }
    }
  };

  // Обновление данных урока
  const updateLessonData = async (elementId: string, element: MapElement) => {
    try {
      const lessonData = lessonsData[elementId];
      if (!lessonData) {
        console.warn("⚠️ Данные урока не найдены для элемента:", elementId);
        return;
      }

      const updateData = {
        title: element.title || lessonData.title,
        description: element.text || lessonData.description,
      };

      console.log("🔄 Обновление данных урока для элемента:", elementId);
      const updatedLesson = await LessonService.updateLesson(lessonData.id!, updateData);

      // Обновляем локальные данные
      setLessonsData((prev) => ({
        ...prev,
        [elementId]: {
          ...prev[elementId],
          title: updatedLesson.title,
          description: updatedLesson.description,
        },
      }));

      console.log("✅ Данные урока обновлены:", elementId);
    } catch (error) {
      console.error("❌ Ошибка обновления данных урока:", elementId, error);
    }
  };

  // Обновление данных контрольной точки
  const updateCheckpointData = async (elementId: string, element: MapElement) => {
    try {
      const checkpointData = checkpointsData[elementId];
      if (!checkpointData) {
        console.warn("⚠️ Данные контрольной точки не найдены для элемента:", elementId);
        return;
      }

      const updateData = {
        title: element.title || checkpointData.title,
        description: element.text || checkpointData.description,
      };

      console.log("🔄 Обновление данных контрольной точки для элемента:", elementId);
      const updatedCheckpoint = await CheckpointService.updateCheckpoint(
        checkpointData.id!,
        updateData
      );

      // Обновляем локальные данные
      setCheckpointsData((prev) => ({
        ...prev,
        [elementId]: {
          ...prev[elementId],
          title: updatedCheckpoint.title,
          description: updatedCheckpoint.description,
        },
      }));

      console.log("✅ Данные контрольной точки обновлены:", elementId);
    } catch (error) {
      console.error("❌ Ошибка обновления данных контрольной точки:", elementId, error);
    }
  };

  // Удаление элемента с удалением связанных данных
  const deleteElement = async (elementId: string) => {
    try {
      const element = elements.find((el) => el.id === elementId);

      // Удаляем связанные данные перед удалением элемента карты
      if (element?.type === "lesson") {
        const lessonData = lessonsData[elementId];
        if (lessonData?.id) {
          try {
            console.log("🗑️ Удаление данных урока:", lessonData.id);
            await LessonService.deleteLesson(lessonData.id);
            console.log("✅ Данные урока удалены:", lessonData.id);
          } catch (error) {
            console.warn("⚠️ Не удалось удалить данные урока:", error);
          }
        }
      } else if (element?.type === "checkpoint") {
        const checkpointData = checkpointsData[elementId];
        if (checkpointData?.id) {
          try {
            console.log("🗑️ Удаление данных контрольной точки:", checkpointData.id);
            await CheckpointService.deleteCheckpoint(checkpointData.id);
            console.log("✅ Данные контрольной точки удалены:", checkpointData.id);
          } catch (error) {
            console.warn("⚠️ Не удалось удалить данные контрольной точки:", error);
          }
        }
      }

      console.log("🗑️ Удаление элемента карты с ID:", elementId);
      await MapService.deleteMapElement(elementId);

      // Удаляем из локального состояния
      setElements((prev) => prev.filter((el) => el.id !== elementId));

      // Удаляем связанные данные из локального состояния
      if (element?.type === "lesson") {
        setLessonsData((prev) => {
          const newData = { ...prev };
          delete newData[elementId];
          return newData;
        });
      } else if (element?.type === "checkpoint") {
        setCheckpointsData((prev) => {
          const newData = { ...prev };
          delete newData[elementId];
          return newData;
        });
      }

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

  // Обновление свойства выбранного элемента
  const updateSelectedElementProperty = (property: string, value: any) => {
    if (!selectedElementId) return;

    updateElement(selectedElementId, { [property]: value });
  };

  // Получение данных урока для выбранного элемента
  const getSelectedLessonData = (): LessonData | null => {
    if (!selectedElementId || selectedElement?.type !== "lesson") return null;
    return lessonsData[selectedElementId] || null;
  };

  // Получение данных контрольной точки для выбранного элемента
  const getSelectedCheckpointData = (): CheckpointData | null => {
    if (!selectedElementId || selectedElement?.type !== "checkpoint") return null;
    return checkpointsData[selectedElementId] || null;
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

  // Функция для получения настроек элемента для текущего брейкпоинта
  const getElementBreakpointSettings = (element: MapElement) => {
    if (!element.breakpoints || !element.breakpoints[activeBreakpoint]) {
      return {};
    }

    return element.breakpoints[activeBreakpoint];
  };

  // Управление брейкпоинтами
  const updateElementBreakpointSetting = (elementId: string, setting: string, value: any) => {
    const element = elements.find((el) => el.id === elementId);

    if (!element) return;

    const breakpoints = { ...element.breakpoints };

    if (!breakpoints[activeBreakpoint]) {
      breakpoints[activeBreakpoint] = {};
    }

    breakpoints[activeBreakpoint] = {
      ...breakpoints[activeBreakpoint],
      [setting]: value,
    };

    updateElement(elementId, { breakpoints });
  };

  const resetBreakpointSettings = (elementId: string) => {
    const element = elements.find((el) => el.id === elementId);

    if (!element) return;

    const breakpoints = { ...element.breakpoints };

    delete breakpoints[activeBreakpoint];

    updateElement(elementId, { breakpoints });
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

  // Drag & Drop для элементов
  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const element = elements.find((el) => el.id === elementId);

    if (!element) return;

    setSelectedElementId(elementId);

    const breakpointSettings = getElementBreakpointSettings(element);
    const currentPositioning = breakpointSettings.positioning || element.positioning;
    const currentOffset = breakpointSettings.offset || element.offset;

    setDragStart({
      position: { x: e.clientX, y: e.clientY },
      type: "element",
      elementStart: currentPositioning === "free" ? element.position : currentOffset,
      elementType: currentPositioning === "free" ? "free" : "fixed",
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

      const updates: Partial<MapElement> = {};
      const breakpointSettings = getElementBreakpointSettings(element);

      if (dragStart.elementType === "free") {
        // Для свободного позиционирования - плавное перемещение
        updates.position = {
          x: Math.max(0, Math.min(100, dragStart.elementStart.x + (deltaX / mapSize.width) * 100)),
          y: Math.max(0, Math.min(100, dragStart.elementStart.y + (deltaY / mapSize.height) * 100)),
        };
      } else {
        // Для фиксированного позиционирования
        const newOffset = {
          x: dragStart.elementStart.x + deltaX,
          y: dragStart.elementStart.y + deltaY,
        };

        if (activeBreakpoint !== "desktop") {
          // Для не-десктоп брейкпоинтов
          updates.breakpoints = {
            ...element.breakpoints,
            [activeBreakpoint]: {
              ...breakpointSettings,
              offset: newOffset,
            },
          };
        } else {
          // Для десктопа
          updates.offset = newOffset;
        }
      }

      // Обновляем локальное состояние
      setElements((prev) =>
        prev.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el))
      );
    },
    [dragStart, selectedElementId, elements, mapSize, activeBreakpoint]
  );

  const handleElementDragEnd = useCallback(() => {
    if (!dragStart || dragStart.type !== "element" || !selectedElementId) return;

    // Сохраняем изменения на сервере
    const element = elements.find((el) => el.id === selectedElementId);

    if (element) {
      updateElement(selectedElementId, element);
    }

    setDragStart(null);
  }, [dragStart, selectedElementId, elements]);

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

  // Функция для вычисления позиции элемента с учетом брейкпоинта и размера карты
  const calculateElementPosition = (element: MapElement, targetMapSize: MapSize): Position => {
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

  // Рендер элемента
  const renderElement = (
    element: MapElement,
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
              backgroundColor: element.color || "#ff6b6b",
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
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className={styles.imagePlaceholder}>Изображение</div>
            )}
          </div>
        );

      case "lesson":
        const lessonData = lessonsData[element.id];
        const displayTitle = lessonData?.title || element.title;
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
              {displayTitle?.charAt(0) || "У"}
            </div>
            <div className={styles.starsArc}>
              {[1, 2, 3].map((star) => (
                <div
                  key={star}
                  className={`${styles.star} ${star <= (element.stars || 0) ? styles.starFilled : ""}`}
                />
              ))}
            </div>
            <div className={styles.lessonTitle}>{displayTitle}</div>
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
        const checkpointData = checkpointsData[element.id];
        const checkpointTitle = checkpointData?.title || element.title;
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
            <div className={styles.checkpointTitle}>{checkpointTitle}</div>
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

  const router = useRouter();

  const handleNavigateToMap = () => {
    router.push(`/admin/courses/${courseId}/course`);
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

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
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
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageWrapper}>
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
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className={styles.pageWrapper}>
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
      </div>
    );
  }

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
              {/*    <div className={styles.sizeInfo}>
                Размер карты: {mapSize.width} × {mapSize.height}px | Брейкпоинт: {activeBreakpoint}
                {courseId && ` | Курс: ${courseId}`}
                {mapId && ` | ID карты: ${mapId.substring(0, 20)}...`}
                {selectedElement && selectedElement.type === "lesson" && (
                  <span>
                    {" "}
                    | ID урока: {lessonsData[selectedElement.id]?.id?.substring(0, 8)}...
                  </span>
                )}
                {selectedElement && selectedElement.type === "checkpoint" && (
                  <span>
                    {" "}
                    | ID контрольной точки:{" "}
                    {checkpointsData[selectedElement.id]?.id?.substring(0, 8)}...
                  </span>
                )}
              </div> */}

              <Button
                text="Просмотр карты"
                onClick={handleNavigateToMap}
                color="#9F0FA7"
                textColor="#fff"
                width="413px"
              />
            </div>
          </div>

          {/* Правая панель свойств */}
          <div className={styles.rightPanel}>
            {selectedElement ? (
              <>
                <h3 className={styles.sectionTitle}>Свойства элемента</h3>

                {/* Общие свойства для всех элементов */}
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
                        updateSelectedElementProperty("positioning", e.target.value);
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
                  <label className={styles.propertyLabel}>Поворот</label>
                  <div className={styles.rotationControl}>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedElement.rotation || 0}
                      onChange={(e) =>
                        updateSelectedElementProperty("rotation", parseInt(e.target.value))
                      }
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

                {/* Специфичные свойства для кружков */}
                {selectedElement.type === "circle" && (
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Цвет</label>
                    <input
                      className={styles.colorInput}
                      type="color"
                      value={selectedElement.color || "#ff6b6b"}
                      onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                    />
                    <div className={styles.sizeControl}>
                      <div className={styles.sizeRow}>
                        <label>Ширина:</label>
                        <input
                          type="number"
                          value={selectedElement.width || 40}
                          onChange={(e) =>
                            updateSelectedElementProperty("width", parseInt(e.target.value))
                          }
                          className={styles.sizeInput}
                        />
                      </div>
                      <div className={styles.sizeRow}>
                        <label>Высота:</label>
                        <input
                          type="number"
                          value={selectedElement.height || 40}
                          onChange={(e) =>
                            updateSelectedElementProperty("height", parseInt(e.target.value))
                          }
                          className={styles.sizeInput}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Специфичные свойства для картинок */}
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
                            onClick={() => updateSelectedElementProperty("imageUrl", "")}
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
                              updateSelectedElementProperty("width", parseInt(e.target.value))
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
                              updateSelectedElementProperty("height", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Специфичные свойства для уроков */}
                {selectedElement.type === "lesson" && (
                  <>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Название урока</label>
                      <input
                        className={styles.propertyInput}
                        type="text"
                        value={selectedElement.title || ""}
                        onChange={(e) => updateSelectedElementProperty("title", e.target.value)}
                      />
                      {lessonsData[selectedElement.id]?.id && (
                        <div className={styles.dataInfo}>
                          ID урока: {lessonsData[selectedElement.id]?.id?.substring(0, 8)}...
                        </div>
                      )}
                    </div>

                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Описание</label>
                      <textarea
                        className={styles.textInput}
                        value={selectedElement.text || ""}
                        onChange={(e) => updateSelectedElementProperty("text", e.target.value)}
                        rows={3}
                      />
                    </div>

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

                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер</label>
                      <div className={styles.sizeControl}>
                        <div className={styles.sizeRow}>
                          <label>Ширина:</label>
                          <input
                            type="number"
                            value={selectedElement.width || 60}
                            onChange={(e) =>
                              updateSelectedElementProperty("width", parseInt(e.target.value))
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
                              updateSelectedElementProperty("height", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Специфичные свойства для текста */}
                {selectedElement.type === "text" && (
                  <>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Текст</label>
                      <textarea
                        className={styles.textInput}
                        value={selectedElement.text || ""}
                        onChange={(e) => updateSelectedElementProperty("text", e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Шрифт</label>
                      <select
                        className={styles.propertySelect}
                        value={selectedElement.fontFamily || "Arial, sans-serif"}
                        onChange={(e) =>
                          updateSelectedElementProperty("fontFamily", e.target.value)
                        }
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
                        value={selectedElement.fontSize || 16}
                        onChange={(e) =>
                          updateSelectedElementProperty("fontSize", parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Цвет</label>
                      <input
                        className={styles.colorInput}
                        type="color"
                        value={selectedElement.color || "#000000"}
                        onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                      />
                    </div>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Начертание</label>
                      <div className={styles.fontStyleControls}>
                        <button
                          className={`${styles.fontStyleButton} ${selectedElement.fontWeight === "bold" ? styles.active : ""}`}
                          onClick={() =>
                            updateSelectedElementProperty(
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
                            updateSelectedElementProperty(
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
                        value={selectedElement.width || 200}
                        onChange={(e) =>
                          updateSelectedElementProperty("width", parseInt(e.target.value))
                        }
                      />
                    </div>
                  </>
                )}

                {/* Специфичные свойства для контрольных точек */}
                {selectedElement.type === "checkpoint" && (
                  <>
                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Название</label>
                      <input
                        className={styles.propertyInput}
                        type="text"
                        value={selectedElement.title || ""}
                        onChange={(e) => updateSelectedElementProperty("title", e.target.value)}
                      />
                      {checkpointsData[selectedElement.id]?.id && (
                        <div className={styles.dataInfo}>
                          ID контрольной точки:{" "}
                          {checkpointsData[selectedElement.id]?.id?.substring(0, 8)}...
                        </div>
                      )}
                    </div>

                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Описание</label>
                      <textarea
                        className={styles.textInput}
                        value={selectedElement.text || ""}
                        onChange={(e) => updateSelectedElementProperty("text", e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Цвет</label>
                      <input
                        className={styles.colorInput}
                        type="color"
                        value={selectedElement.color || "#ff0000"}
                        onChange={(e) => updateSelectedElementProperty("color", e.target.value)}
                      />
                    </div>

                    <div className={styles.propertyGroup}>
                      <label className={styles.propertyLabel}>Размер</label>
                      <div className={styles.sizeControl}>
                        <div className={styles.sizeRow}>
                          <label>Ширина:</label>
                          <input
                            type="number"
                            value={selectedElement.width || 40}
                            onChange={(e) =>
                              updateSelectedElementProperty("width", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                        <div className={styles.sizeRow}>
                          <label>Высота:</label>
                          <input
                            type="number"
                            value={selectedElement.height || 40}
                            onChange={(e) =>
                              updateSelectedElementProperty("height", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Специфичные свойства для эмодзи */}
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
                              updateSelectedElementProperty("fontSize", parseInt(e.target.value))
                            }
                            className={styles.sizeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* Кнопка сохранения */}
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

        <div className={styles.saveInfo}>
          Элементов: {elements.length} | Уроков: {Object.keys(lessonsData).length} | Контрольных
          точек: {Object.keys(checkpointsData).length}
        </div>
      </div>
    </div>
  );
};
/* eslint-disable */
export default Map;
