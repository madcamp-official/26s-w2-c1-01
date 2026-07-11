import type { CSSProperties, ReactNode } from "react";
import "./Card.css";

interface CardProps {
  children: ReactNode;
  dark?: boolean;
  large?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Card({ children, dark, large, style, className }: CardProps) {
  const classes = ["card", dark && "card--dark", large && "card--large", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
