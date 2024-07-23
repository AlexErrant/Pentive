import { ThemeSelector } from 'shared-dom'
import { type JSX, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { createServerAction$, createServerData$ } from 'solid-start/server'
import { getUserId, logout } from '~/session'

function Nav(): JSX.Element {
	const userId = createServerData$(
		async (_, { request }) => await getUserId(request),
	)
	const [, { Form }] = createServerAction$(
		async (_: FormData) => await logout(),
	)
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
						<Form class='inline'>
							{/* medTODO csrf */}
							<button name='logout' type='submit'>
								Logout
							</button>
						</Form>
					</Show>
				</span>
			</nav>
		</header>
	)
}

export default Nav
