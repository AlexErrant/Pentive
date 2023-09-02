import { type NookId } from 'shared'
import { getNook } from 'shared-edge'
import { Show, type VoidComponent } from 'solid-js'
import { A, Outlet, useRouteData, type RouteDataArgs } from 'solid-start'
import { createServerData$ } from 'solid-start/server'
import RelativeDate from '~/components/relativeDate'

export function routeData({ params }: RouteDataArgs) {
	return {
		nook: () => params.nook,
		nookDetails: createServerData$(
			async (nook) => await getNook(nook as NookId),
			{ key: () => params.nook, initialValue: null },
		),
	}
}

export default function NookLayout() {
	const { nookDetails, nook } = useRouteData<typeof routeData>()
	return (
		<Show
			when={nookDetails() === undefined}
			fallback={
				<div class='flex'>
					<div class='grow'>
						<Outlet />
					</div>
					<aside class='basis-40'>
						<Sidebar nook={nook()!} nookDetails={nookDetails()!} />
					</aside>
				</div>
			}
		>
			<a href={`/nooks/create?nook=${nook() ?? ''}`}>Create Nook</a>
		</Show>
	)
}

const Sidebar: VoidComponent<{
	nook: string
	nookDetails: Awaited<ReturnType<typeof getNook>>
}> = (props) => {
	return (
		<Show when={props.nookDetails}>
			{(nd) => (
				<>
					<h1 class='text-lg font-bold'>/n/{props.nook}</h1>
					<A href={`/n/${props.nook}/templates`}>Templates</A>
					<div>
						Est. <RelativeDate date={nd().created} />
					</div>
					<div>mods:{nd().moderators}</div>
				</>
			)}
		</Show>
	)
}
