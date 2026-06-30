import { NavLink } from "react-router";
import { css } from "../../styled-system/css";
import { useAuth } from "../lib/auth";

const navItems = [
  {
    to: "/dashboard",
    label: "ダッシュボード",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: "/members",
    label: "メンバー一覧",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: "/blog/new",
    label: "ブログ作成",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    to: "/equipment",
    label: "備品管理",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: "/calendar",
    label: "カレンダー",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

const sidebarStyle = css({
  width: "240px",
  bg: "bg.sidebar",
  borderRight: "1px solid",
  borderColor: "border.DEFAULT",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
});

const navStyle = css({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "xs",
  p: "sm",
  pt: "md",
});

const navLinkBase = css({
  display: "flex",
  alignItems: "center",
  gap: "sm",
  px: "md",
  py: "sm",
  borderRadius: "md",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "text.secondary",
  textDecoration: "none",
  transition: "all 0.2s ease",
  cursor: "pointer",
  position: "relative",
  _hover: {
    bg: "bg.sidebarHover",
    color: "text.primary",
  },
});

const navLinkActive = css({
  bg: "bg.sidebarActive",
  color: "accent",
  fontWeight: "600",
  _hover: {
    bg: "bg.sidebarActive",
    color: "accent",
  },
  _before: {
    content: '""',
    position: "absolute",
    left: 0,
    top: "4px",
    bottom: "4px",
    width: "3px",
    borderRadius: "full",
    bg: "accent",
  },
});

const footerStyle = css({
  borderTop: "1px solid",
  borderColor: "border.DEFAULT",
  p: "md",
  display: "flex",
  flexDirection: "column",
  gap: "sm",
});

const profileStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "sm",
});

const avatarStyle = css({
  width: "32px",
  height: "32px",
  borderRadius: "full",
  bg: "bg.sidebarHover",
  flexShrink: 0,
  objectFit: "cover",
});

const avatarFallbackStyle = css({
  width: "32px",
  height: "32px",
  borderRadius: "full",
  bg: "accent",
  color: "text.inverse",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontWeight: "600",
  flexShrink: 0,
});

const profileInfoStyle = css({
  flex: 1,
  minWidth: 0,
});

const profileNameStyle = css({
  fontSize: "0.8125rem",
  fontWeight: "600",
  color: "text.primary",
  lineHeight: "1.3",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const profileHandleStyle = css({
  fontSize: "0.6875rem",
  color: "text.muted",
  lineHeight: "1.3",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const logoutButtonStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "xs",
  px: "md",
  py: "6px",
  borderRadius: "md",
  fontSize: "0.8125rem",
  fontWeight: "500",
  color: "text.muted",
  bg: "transparent",
  border: "1px solid",
  borderColor: "border.DEFAULT",
  cursor: "pointer",
  transition: "all 0.2s ease",
  _hover: {
    bg: "bg.sidebarHover",
    color: "error.text",
    borderColor: "border.hover",
  },
});

export default function Sidebar() {
  const { user, logout } = useAuth();

  const displayName = `${user.lastName} ${user.firstName}`;
  const avatarUrl = user.discordAvatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.discordAvatar}.png?size=64`
    : null;

  return (
    <aside className={sidebarStyle}>
      {/* Navigation */}
      <nav className={navStyle}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? `${navLinkBase} ${navLinkActive}` : navLinkBase
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer - User Profile + Logout */}
      <div className={footerStyle}>
        <div className={profileStyle}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className={avatarStyle}
            />
          ) : (
            <div className={avatarFallbackStyle}>
              {user.lastName.charAt(0)}
            </div>
          )}
          <div className={profileInfoStyle}>
            <div className={profileNameStyle}>{displayName}</div>
            <div className={profileHandleStyle}>
              @{user.discordUsername}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className={logoutButtonStyle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          ログアウト
        </button>
      </div>
    </aside>
  );
}
