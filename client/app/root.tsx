import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import "./styles/global.css";
import { css } from "../styled-system/css";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "EDTC Members" },
    {
      name: "description",
      content:
        "EDTCメンバー専用ダッシュボード - ブログ作成や備品管理などサークル活動を円滑に",
    },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous" as const,
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function HydrateFallback() {
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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "エラーが発生しました";
  let details = "予期しないエラーが発生しました。";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "ページが見つかりません" : "エラー";
    details =
      error.status === 404
        ? "お探しのページは存在しません。"
        : error.statusText || details;
  }

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
        textAlign: "center",
        p: "2xl",
      })}
    >
      <h1 className={css({ fontSize: "2rem", fontWeight: "700" })}>
        {message}
      </h1>
      <p className={css({ color: "text.secondary", fontSize: "1rem" })}>
        {details}
      </p>
    </div>
  );
}
