import { JSX, lazy } from "solid-js"
import type { RouteDefinition } from "solid-app-router"

import Home from "./pages/home"
import HomeData from "./pages/home.data"
import AboutData from "./pages/about.data"

export interface NavLinkData {
  readonly content: JSX.Element
  readonly href: string
}

export const navLinks: readonly NavLinkData[] = [
  {
    content: "Home",
    href: "/",
  },
  {
    content: "About",
    href: "/about",
  },
  {
    content: "Templates",
    href: "/templates",
  },
  {
    content: "Plugins",
    href: "/plugins",
  },
  {
    content: "Error",
    href: "/error",
  },
]

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
    path: "/templates",
    component: lazy(async () => await import("./pages/templates")),
  },
  {
    path: "/plugins",
    component: lazy(async () => await import("./pages/plugins")),
  },
  {
    path: "/testdb",
    component: lazy(async () => await import("./pages/testdb")),
  },
  {
    path: "**",
    component: lazy(async () => await import("./pages/404")),
  },
]
