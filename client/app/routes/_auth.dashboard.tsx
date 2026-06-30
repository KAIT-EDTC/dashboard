import { css } from "../../styled-system/css";
import { useAuth } from "../lib/auth";
import ProfileCard from "../components/ProfileCard";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      {/* Page Title */}
      <h1
        className={css({
          fontSize: "2rem",
          fontWeight: "700",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "border.DEFAULT",
          pb: "md",
          mb: "xl",
          letterSpacing: "-0.02em",
        })}
      >
        ダッシュボード
      </h1>

      {/* Grid */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "lg",
          "@media (max-width: 768px)": {
            gridTemplateColumns: "1fr",
          },
        })}
      >
        {/* Main Column */}
        <div>
          <ProfileCard user={user} />
        </div>

        {/* Side Column */}
        <div>
          {/* Events Card */}
          <div
            className={css({
              bg: "bg.island",
              borderRadius: "lg",
              border: "1px solid",
              borderColor: "border.DEFAULT",
              overflow: "hidden",
            })}
          >
            {/* Card Header */}
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: "lg",
                py: "md",
                borderBottom: "1px solid",
                borderColor: "border.DEFAULT",
              })}
            >
              <h2
                className={css({
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "text.primary",
                })}
              >
                参加イベント
              </h2>
              <span
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "22px",
                  height: "22px",
                  px: "sm",
                  borderRadius: "full",
                  bg: "bg.tertiary",
                  color: "text.muted",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                })}
              >
                0
              </span>
            </div>

            {/* Card Body - Empty State */}
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: "3xl",
                px: "lg",
                gap: "sm",
              })}
            >
              <span
                className={css({
                  fontSize: "2.5rem",
                  lineHeight: 1,
                })}
              >
                📅
              </span>
              <p
                className={css({
                  fontSize: "0.875rem",
                  color: "text.muted",
                  textAlign: "center",
                })}
              >
                参加予定のイベントはありません
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
