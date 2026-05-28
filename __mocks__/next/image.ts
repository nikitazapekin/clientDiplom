import React from "react";

type ImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  [key: string]: unknown;
};

const MockImage = ({ src, alt, className, ...props }: ImageProps) => {
  return React.createElement("img", {
    src: typeof src === "object" ? "test-file-stub" : src,
    alt,
    className,
    ...props,
  });
};

export default MockImage;
