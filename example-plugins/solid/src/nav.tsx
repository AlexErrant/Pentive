// todo - investigate a less trash build setup. https://www.reddit.com/r/solidjs/comments/gym0ed/bundling_a_web_components/

import { For, type VoidComponent } from "solid-js"
import { type NavLinkData } from "../../../app/src/customElements/contracts"

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Nav: VoidComponent<{ navLinks: NavLinkData[] }> = (props) => {
  return (
    <nav class="bg-gray-200 text-gray-900 px-4">
      <ul class="flex items-center">
        <For each={props.navLinks}>
          {({ href, name }) => (
            <li class="py-2 px-4">
              <a href={href} class="no-underline hover:underline">
                {name}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  )
}
