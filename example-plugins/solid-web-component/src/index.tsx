// todo - investigate a less trash build setup. https://www.reddit.com/r/solidjs/comments/gym0ed/bundling_a_web_components/

import { For, JSX, VoidComponent } from "solid-js"
import { customElement } from "solid-element"

interface NavLinkData {
  content: JSX.Element
  href: string
}

const Nav: VoidComponent<{ navLinks: NavLinkData[] }> = (props) => {
  return (
    <nav class="bg-gray-200 text-gray-900 px-4">
      <ul class="flex items-center">
        <For each={props.navLinks}>
          {({ href, content }) => (
            <li class="py-2 px-4">
              <a href={href} class="no-underline hover:underline">
                {content}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  )
}

customElement("pentive-nav", { navLinks: [] }, Nav)
