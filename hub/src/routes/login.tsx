import { type JSX, Suspense, createSignal } from 'solid-js'
import { getUserId } from '~/session'
import { devLoginUrl, githubLoginUrl } from './api/auth/[...solidAuth]'
import {
	type RouteDefinition,
	cache,
	createAsync,
	redirect,
} from '@solidjs/router'

const getUserIdCached = cache(async () => {
	'use server'
	if ((await getUserId()) != null) {
		throw redirect('/') as unknown
	}
	return null
}, 'userId')

export const route = {
	preload() {
		void getUserIdCached()
	},
} satisfies RouteDefinition

export default function Login(): JSX.Element {
	const emptyString = createAsync(async () => await getUserIdCached())
	const [alphaKey, setAlphaKey] = createSignal('')
	return (
		<main>
			<h1>Login</h1>
			<Suspense>
				{emptyString()}
				<div>
					<span>Alpha Key:</span>
					<input
						class='w-75px rounded-lg p-1 text-sm'
						type='text'
						onInput={(e) => setAlphaKey(e.currentTarget.value)}
					/>
					<div>
						<a target='_self' href={githubLoginUrl(alphaKey())}>
							Sign in via Github
						</a>
					</div>
				</div>
				{import.meta.env.DEV && (
					<>
						<h2>Dev Login</h2>
						<div>
							<a href={devLoginUrl('Griddle')}>Sign in as Griddle</a>
						</div>
						<div>
							<a href={devLoginUrl('Harry')}>Sign in as Harry</a>
						</div>
						<div>
							<a href={devLoginUrl('Campal')}>Sign in as Campal</a>
						</div>
					</>
				)}
			</Suspense>
		</main>
	)
}
