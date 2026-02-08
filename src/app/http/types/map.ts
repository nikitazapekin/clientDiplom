export interface Position {
  x: number;
  y: number;
}

export type MapElementType = "circle" | "image" | "lesson" | "text" | "checkpoint" | "emoji";
export type PositioningType = "left" | "center" | "right" | "free";

export interface BreakpointSettings {
  hidden?: boolean;
  positioning?: PositioningType;
  offset?: Position;
}

export interface MapElementResponse {
  id: string;
  type: MapElementType;
  courseMapId: string;
  title?: string;
  text?: string;
  color?: string;
  imageUrl?: string;
  emoji?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  positionX: number;
  positionY: number;
  positioning: PositioningType;
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
  rotation: number;
  isActive?: boolean;
  stars?: number;
  breakpoints?: Record<string, BreakpointSettings>;
  createdAt: string;
  updatedAt: string;
}

export interface CourseMapResponse {
  id: string;
  courseId: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  backgroundRepeat: string;
  backgroundSize: string;
  elements: MapElementResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseMapRequest {
  courseId: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
  elements?: CreateMapElementRequest[];
}

export interface UpdateCourseMapRequest {
  width?: number;
  height?: number;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
}

export interface CreateMapElementRequest {
  type: MapElementType;
  title?: string;
  text?: string;
  color?: string;
  imageUrl?: string;
  emoji?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  positionX: number;
  positionY: number;
  positioning: PositioningType;
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
  rotation?: number;
  isActive?: boolean;
  stars?: number;
  breakpoints?: Record<string, any>;
}

export interface UpdateMapElementRequest extends Partial<CreateMapElementRequest> {}
