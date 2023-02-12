import { lazy } from "solid-js"
import type { RouteDefinition } from "@solidjs/router"

import Home from "./pages/home.js"
import HomeData from "./pages/home.data.js"
import AboutData from "./pages/about.data.js"
import { NavLinkData } from "./custom-elements/contracts.js"

export const navLinks: readonly NavLinkData[] = [
  {
    name: "Home",
    href: "/",
  },
  {
    name: "About",
    href: "/about",
  },
  {
    name: "Templates",
    href: "/templates",
  },
  {
    name: "Cards",
    href: "/cards",
  },
  {
    name: "Plugins",
    href: "/plugins",
  },
  {
    name: "Error",
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
    component: lazy(async () => await import("./pages/about.jsx")),
    data: AboutData,
  },
  {
    path: "/templates",
    component: lazy(async () => await import("./pages/templates.jsx")),
  },
  {
    path: "/cards",
    component: lazy(async () => await import("./pages/cards.jsx")),
  },
  {
    path: "/plugins",
    component: lazy(async () => await import("./pages/plugins.jsx")),
  },
  {
    path: "/testdb",
    component: lazy(async () => await import("./pages/testdb.jsx")),
  },
  {
    path: "**",
    component: lazy(async () => await import("./pages/404.jsx")),
  },
]
