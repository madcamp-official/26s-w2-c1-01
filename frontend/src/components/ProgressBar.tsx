import "./ProgressBar.css";

interface ProgressBarProps {
  percent: number;
  variant?: "primary" | "skill" | "skill-weak";
  height?: number;
  trackColor?: string;
}

export function ProgressBar({ percent, variant = "primary", height, trackColor }: ProgressBarProps) {
  return (
    <div
      className={`progress-track progress-track--${variant}`}
      style={{ height, background: trackColor }}
    >
      <div className={`progress-fill progress-fill--${variant}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
