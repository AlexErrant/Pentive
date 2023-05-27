import { lazy } from "solid-js"
import type { RouteDefinition } from "@solidjs/router"

import Home from "./pages/home"
import HomeData from "./pages/home.data"
import AboutData from "./pages/about.data"
import TemplatesData from "./pages/templates.data"
import { type NavLinkData } from "./customElements/contracts"

export const navLinks: NavLinkData[] = [
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
    component: lazy(async () => await import("./pages/about")),
    data: AboutData,
  },
  {
    path: "/templates",
    component: lazy(async () => await import("./pages/templates")),
    data: TemplatesData,
  },
  {
    path: "/cards",
    component: lazy(async () => await import("./pages/cards")),
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
