// todo - investigate a less trash build setup. https://www.reddit.com/r/solidjs/comments/gym0ed/bundling_a_web_components/

import { For, type VoidComponent } from "solid-js"
import { type NavLinkData } from "app/src/components/contracts"

export const Nav: VoidComponent<{ navLinks: NavLinkData[] }> = (props) => {
  return (
    <nav class="bg-gray-200 text-gray-900 px-4">
      <ul class="flex items-center">
        <For each={props.navLinks}>
          {({ href, child }) => (
            <li class="py-2 px-4">
              <a href={href} class="no-underline hover:underline">
                {child}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  )
}
