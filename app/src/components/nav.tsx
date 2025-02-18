import { ThemeSelector } from 'shared-dom/themeSelector'
import { For, type VoidComponent, Show } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import type { NavLinkData } from './contracts'
import { useWhoAmIContext } from './whoAmIContext'

const Nav: VoidComponent<{ navLinks: NavLinkData[] }> = (props) => {
	const location = useLocation()
	const whoAmI = useWhoAmIContext()
	return (
		<nav class='text-gray-900 bg-gray-200 px-4'>
			<ul class='flex items-center'>
				<For each={props.navLinks}>
					{({ href, child }) => (
						<li class='px-4 py-2'>
							<A
								href={href}
								class='no-underline hover:underline'
								activeClass='font-bold'
								end={href === '/'}
							>
								{typeof child === 'function' ? child() : child}
							</A>
						</li>
					)}
				</For>
				<li>
					<ThemeSelector />
				</li>
				<span class='profile'>
					<Show
						when={whoAmI() != null}
						fallback={
							<a href={import.meta.env.VITE_HUB_ORIGIN + `/login`}>Login</a>
						}
					>
						<a href={import.meta.env.VITE_HUB_ORIGIN + `/u/${whoAmI()!}`}>
							{whoAmI()!}
						</a>
					</Show>
				</span>
				<li class='ml-auto flex items-center space-x-1 text-sm'>
					<span>URL:</span>
					<input
						class='w-75px form-input rounded-lg p-1 text-sm'
						type='text'
						readOnly
						value={location.pathname}
					/>
				</li>
			</ul>
		</nav>
	)
}

export default Nav
