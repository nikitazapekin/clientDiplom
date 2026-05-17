import type { StaticImageData } from "next/image";

export interface WelcomeCardProps {
  item: { id: number; title: string; type: string; image: StaticImageData; path: string };
}
