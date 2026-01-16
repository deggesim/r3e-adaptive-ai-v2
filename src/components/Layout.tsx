import type { ReactNode } from "react";
import "./Layout.css";

export type MenuItem =
  | "ai-management"
  | "fix-qualy-times"
  | "build-results-database";

interface LayoutProps {
  readonly children: ReactNode;
  readonly activeMenuItem: MenuItem;
  readonly onMenuItemClick: (item: MenuItem) => void;
}

interface MenuItemData {
  id: MenuItem;
  label: string;
  icon: string;
}

const menuItems: MenuItemData[] = [
  { id: "ai-management", label: "AI Management", icon: "🤖" },
  { id: "fix-qualy-times", label: "Fix Qualy Times", icon: "⏱️" },
  { id: "build-results-database", label: "Build Results Database", icon: "📊" },
];

export default function Layout({
  children,
  activeMenuItem,
  onMenuItemClick,
}: LayoutProps) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>R3E Toolbox</h1>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${
                activeMenuItem === item.id ? "active" : ""
              }`}
              onClick={() => onMenuItemClick(item.id)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
