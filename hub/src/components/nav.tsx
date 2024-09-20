import { ThemeSelector } from 'shared-dom/themeSelector'
import { type JSX, Show } from 'solid-js'
import {
	A,
	action,
	cache,
	createAsync,
	type RouteDefinition,
} from '@solidjs/router'
import { getUserId, logout } from '~/session'

// eslint-disable-next-line @typescript-eslint/require-await
const logoutAction = action(async () => {
	'use server'
	return logout()
})

const getUserIdCached = cache(async () => {
	'use server'
	return await getUserId()
}, 'userId')

export const route = {
	preload() {
		void getUserIdCached()
	},
} satisfies RouteDefinition

function Nav(): JSX.Element {
	const userId = createAsync(async () => await getUserIdCached())
	return (
		<header class='header'>
			<nav class='inner flex'>
				<A href='/' end>
					<strong>Pentive</strong>
				</A>
				<A href={import.meta.env.VITE_APP_ORIGIN}>
					<strong>App</strong>
				</A>
				<ThemeSelector />
				<span class='profile'>
					<Show when={userId() != null} fallback={<A href='/login'>Login</A>}>
						<A href={`/u/${userId()!}`}>{userId()!}</A>
						<form action={logoutAction} method='post' class='inline'>
							{/* medTODO csrf */}
							<button name='logout' type='submit'>
								Logout
							</button>
						</form>
					</Show>
				</span>
			</nav>
		</header>
	)
}

export default Nav
