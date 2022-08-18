import type { JSX } from "solid-js"
import { NavLink, useLocation } from "solid-app-router"

export default function Nav(): JSX.Element {
  const location = useLocation()
  return (
    <nav class="bg-gray-200 text-gray-900 px-4">
      <ul class="flex items-center">
        <li class="py-2 px-4">
          <NavLink
            href="/"
            class="no-underline hover:underline"
            activeClass="font-bold"
            end
          >
            Home
          </NavLink>
        </li>
        <li class="py-2 px-4">
          <NavLink
            href="/about"
            class="no-underline hover:underline"
            activeClass="font-bold"
          >
            About
          </NavLink>
        </li>
        <li class="py-2 px-4">
          <NavLink
            href="/error"
            class="no-underline hover:underline"
            activeClass="font-bold"
          >
            Error
          </NavLink>
        </li>

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
