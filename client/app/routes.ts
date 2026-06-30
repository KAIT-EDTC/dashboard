import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  /* Public routes */
  route("login", "./routes/login.tsx"),
  route("register", "./routes/register.tsx"),

  /* Protected routes - wrapped by AuthGuard + Dashboard layout */
  layout("./routes/_auth.tsx", [
    route("dashboard", "./routes/_auth.dashboard.tsx"),
    route("blog/new", "./routes/_auth.blog.new.tsx"),
    route("members", "./routes/_auth.members.tsx"),
    route("equipment", "./routes/_auth.equipment.tsx"),
    route("calendar", "./routes/_auth.calendar.tsx"),
  ]),

  /* Catch-all redirect to dashboard */
  route("*", "./routes/catchall.tsx"),
] satisfies RouteConfig;
