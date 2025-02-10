// todo - investigate a less trash build setup. https://www.reddit.com/r/solidjs/comments/gym0ed/bundling_a_web_components/

import { For, type VoidComponent } from 'solid-js'
import type { NavLinkData } from 'app/components/contracts'
import { A, Router } from '@solidjs/router'

export const Nav: VoidComponent<{ navLinks: NavLinkData[] }> = (props) => {
	return (
		<Router>
			<nav class='bg-gray-200 text-gray-900 px-4'>
				<ul class='flex items-center'>
					<For each={props.navLinks}>
						{({ href, child }) => (
							<li class='py-2 px-4'>
								<A href={href} class='no-underline hover:underline'>
									{typeof child === 'function' ? child() : child}
								</A>
							</li>
						)}
					</For>
				</ul>
			</nav>
		</Router>
	)
}
