import { lazy } from "solid-js"
import type { RouteDefinition } from "solid-app-router"

import Home from "./pages/home"
import HomeData from "./pages/home.data"
import AboutData from "./pages/about.data"

export const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Home,
    data: HomeData,
  },
  {
    path: "/about",
    component: lazy(async () => await import("./pages/about")),
    data: AboutData,
  },
  {
    path: "**",
    component: lazy(async () => await import("./errors/404")),
  },
]
