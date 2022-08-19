import { JSX, lazy } from "solid-js"
import type { RouteDefinition } from "solid-app-router"

import Home from "./pages/home"
import HomeData from "./pages/home.data"
import AboutData from "./pages/about.data"
import TemplatesData from "./pages/templates.data"

export interface NavLinkData {
  content: JSX.Element
  href: string
}

export const navLinks: NavLinkData[] = [
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
    data: TemplatesData,
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
