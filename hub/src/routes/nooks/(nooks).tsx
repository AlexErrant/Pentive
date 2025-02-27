import { Show, type JSX, For } from 'solid-js'
import { getNooks } from 'shared-edge'
import { query, createAsync, type RouteDefinition } from '@solidjs/router'

const getNooksCached = query(async () => {
	'use server'
	return await getNooks()
}, 'nooks')

export const route = {
	preload() {
		void getNooksCached()
	},
} satisfies RouteDefinition

export default function Nooks(): JSX.Element {
	const nooks = createAsync(async () => await getNooksCached(), {
		deferStream: true,
	})
	return (
		<main>
			<ul>
				<For each={nooks()}>
					{(n) => (
						<li>
							<a href={`/n/${n.id}`}>/n/{n.id}</a> -{' '}
							<Show when={n.type === 'restricted'}>
								<em>Restricted</em> -
							</Show>
							<span>{n.description}</span>
						</li>
					)}
				</For>
			</ul>
		</main>
	)
}
