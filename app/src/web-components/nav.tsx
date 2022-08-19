import { For, JSX } from "solid-js"
import { NavLink, useLocation } from "solid-app-router"
import { navLinks } from "../routes"

export default function Nav(): JSX.Element {
  const location = useLocation()
  return (
    <nav class="bg-gray-200 text-gray-900 px-4">
      <ul class="flex items-center">
        <For each={navLinks}>
          {({ href, className, activeClass, end, content }) => (
            <li class="py-2 px-4">
              <NavLink
                href={href}
                class={className}
                activeClass={activeClass}
                end={end}
              >
                {content}
              </NavLink>
            </li>
          )}
        </For>

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
