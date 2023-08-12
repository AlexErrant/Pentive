import { ThemeSelector } from "shared-dom"
import { For, type VoidComponent, Show } from "solid-js"
import { NavLink, useLocation } from "@solidjs/router"
import { type NavLinkData } from "./contracts"
import { getUserId } from "../globalState"
const ends = new Set(["/"])

const Nav: VoidComponent<{ navLinks: NavLinkData[] }> = (props) => {
  const location = useLocation()
  return (
    <nav class="bg-gray-200 text-gray-900 px-4">
      <ul class="flex items-center">
        <For each={props.navLinks}>
          {({ href, child }) => (
            <li class="py-2 px-4">
              <NavLink
                href={href}
                class="no-underline hover:underline"
                activeClass="font-bold"
                end={ends.has(href)}
              >
                {typeof child === "function" ? child() : child}
              </NavLink>
            </li>
          )}
        </For>
        <li>
          <ThemeSelector />
        </li>
        <span class="profile">
          <Show
            when={getUserId() != null}
            fallback={
              <a href={import.meta.env.VITE_HUB_ORIGIN + `/login`}>Login</a>
            }
          >
            <a href={import.meta.env.VITE_HUB_ORIGIN + `/u/${getUserId()!}`}>
              {getUserId()!}
            </a>
          </Show>
        </span>
        <li class="text-sm flex items-center space-x-1 ml-auto">
          <span>URL:</span>
          <input
            class="w-75px p-1 bg-white text-sm rounded-lg"
            type="text"
            readOnly
            value={location.pathname}
          />
        </li>
      </ul>
    </nav>
  )
}

export default Nav
