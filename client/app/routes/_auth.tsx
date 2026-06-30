import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { css } from "../../styled-system/css";
import { AuthContext, type AuthUser } from "../lib/auth";
import { client } from "../lib/hono";
import Sidebar from "../components/Sidebar";

export default function AuthLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await client.api.users.me.$get();
        if (!res.ok) {
          navigate("/login");
          return;
        }
        const data = await res.json();
        setUser(data as AuthUser);
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const logout = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
    window.location.href = `${apiUrl}/api/auth/logout`;
  };

  if (loading || !user) {
    return (
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "lg",
          bg: "bg.base",
        })}
      >
        <div
          className={css({
            width: "36px",
            height: "36px",
            border: "3px solid",
            borderColor: "border.DEFAULT",
            borderTopColor: "accent",
            borderRadius: "full",
            animation: "spin 0.8s linear infinite",
          })}
        />
        <p className={css({ color: "text.muted", fontSize: "0.875rem" })}>
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {/* Page Wrapper */}
      <div
        className={css({
          minHeight: "100vh",
          bg: "bg.base",
          display: "flex",
          flexDirection: "column",
        })}
      >
        {/* Header */}
        <header
          className={css({
            bg: "bg.header",
            height: "56px",
            shadow: "header",
            display: "flex",
            alignItems: "center",
            px: "lg",
            flexShrink: 0,
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "sm",
            })}
          >
            {/* Cube icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className={css({ flexShrink: 0 })}
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={css({ color: "accent" })}
              />
            </svg>
            <span
              className={css({
                fontSize: "1.125rem",
                fontWeight: "700",
                color: "text.primary",
                letterSpacing: "-0.02em",
              })}
            >
              EDTC ダッシュボード
            </span>
          </div>
        </header>

        {/* Main */}
        <main
          className={css({
            flex: 1,
            display: "flex",
            p: "lg",
            overflow: "hidden",
          })}
        >
          {/* Island */}
          <div
            className={css({
              bg: "bg.island",
              borderRadius: "2xl",
              shadow: "island",
              flex: 1,
              display: "flex",
              flexDirection: "row",
              overflow: "hidden",
            })}
          >
            {/* Sidebar */}
            <Sidebar />

            {/* Content Area */}
            <div
              className={css({
                flex: 1,
                overflowY: "auto",
                p: "2xl",
              })}
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
