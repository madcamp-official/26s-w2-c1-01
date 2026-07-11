import type { ReactNode } from "react";
import "./Chip.css";

interface ChipProps {
  children: ReactNode;
  onRemove?: () => void;
  dashed?: boolean;
}

export function Chip({ children, onRemove, dashed }: ChipProps) {
  if (dashed) {
    return <span className="chip chip--dashed">{children}</span>;
  }
  return (
    <span className="chip">
      {children}
      {onRemove && (
        <span className="chip__remove" onClick={onRemove}>
          ✕
        </span>
      )}
    </span>
  );
}
