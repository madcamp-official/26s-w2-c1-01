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
    <span className={`chip${onRemove ? " chip--removable" : ""}`}>
      {children}
      {onRemove && (
        <button className="chip__remove" type="button" onClick={onRemove} aria-label="기술 스택 삭제">
          x
        </button>
      )}
    </span>
  );
}
