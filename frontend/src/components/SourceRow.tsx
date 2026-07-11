import type { ConnectedSource } from "../types/portfolio";
import "./SourceRow.css";

interface SourceRowProps {
  source: ConnectedSource;
  onDelete?: () => void;
}

const typeTone: Record<ConnectedSource["type"], string> = {
  GitHub: "source-row__type--github",
  Notion: "source-row__type--notion",
  PDF: "source-row__type--pdf",
};

export function SourceRow({ source, onDelete }: SourceRowProps) {
  return (
    <div className="source-row">
      <span className={`source-row__type ${typeTone[source.type]}`}>{source.type}</span>
      <span className="source-row__label">{source.label}</span>
      {source.connected ? (
        <span className="source-row__status">연결됨 ✓</span>
      ) : (
        <span className="source-row__delete" onClick={onDelete}>
          삭제
        </span>
      )}
    </div>
  );
}
