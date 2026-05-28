import React from "react";

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
};

const MockLink = ({ href, children, className, ...props }: LinkProps) => {
  return React.createElement("a", { href, className, ...props }, children);
};

export default MockLink;
