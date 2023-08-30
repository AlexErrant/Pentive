import { type JSX, createEffect, Suspense } from 'solid-js'
import { useRouteData } from '@solidjs/router'
import type AboutData from './about.data'

export default function About(): JSX.Element {
	const name = useRouteData<typeof AboutData>()

	createEffect(() => {
		console.log(name())
	})

	return (
		<section class='text-gray-700 bg-pink-100 p-8'>
			<h1 class='text-2xl font-bold'>About</h1>

			<p class='mt-4'>A page all about this website.</p>

			<p>
				<span>We love</span>
				<Suspense fallback={<span>...</span>}>
					<span>&nbsp;{name()}</span>
				</Suspense>
			</p>
		</section>
	)
}
