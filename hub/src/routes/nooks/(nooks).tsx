import { Show, type JSX, For } from 'solid-js'
import { useRouteData } from 'solid-start'
import { getNooks } from 'shared-edge'
import { createServerData$ } from 'solid-start/server'

export function routeData() {
	return {
		nooks: createServerData$(async () => await getNooks()),
	}
}

export default function Nooks(): JSX.Element {
	const { nooks } = useRouteData<typeof routeData>()
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
