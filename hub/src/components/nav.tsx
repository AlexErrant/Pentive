import { ThemeSelector } from './clientOnly'
import { type JSX, Show } from 'solid-js'
import { A, action } from '@solidjs/router'
import { logout } from '~/session'
import { useUserIdContext } from './userIdContext'

// eslint-disable-next-line @typescript-eslint/require-await
const logoutAction = action(async () => {
	'use server'
	return logout()
})

function Nav(): JSX.Element {
	const userId = useUserIdContext()
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
