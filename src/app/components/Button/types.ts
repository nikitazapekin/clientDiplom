import type { MouseEventHandler } from "react";

export interface ButtonProps {
  text: string;
  color?: string;
  width?: string;
  textColor?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}
