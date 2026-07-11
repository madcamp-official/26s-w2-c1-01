import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./Layout.css";

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo">
          <span className="header__logo-mark">핏</span>
          <span className="header__logo-text">이력핏</span>
        </Link>
      </div>
    </header>
  );
}

export function PageContainer({
  children,
  maxWidth,
  paddingTop,
  centered,
}: {
  children: ReactNode;
  maxWidth: number;
  paddingTop?: number;
  centered?: boolean;
}) {
  return (
    <div
      className="page-container"
      style={{ maxWidth, paddingTop, textAlign: centered ? "center" : undefined }}
    >
      {children}
    </div>
  );
}
