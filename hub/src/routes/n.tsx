import { type NookId } from 'shared'
import { getNook } from 'shared-edge'
import { For, Show, type VoidComponent } from 'solid-js'
import {
	cache,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'
import RelativeDate from '~/components/relativeDate'
import { IsModProvider } from '~/components/isModContext'

const getNookDetailsCached = cache(async (nook?: string) => {
	'use server'
	if (nook == null) return null // nook may be null when doing a redirect after nook creation; not sure why
	return await getNook(nook as NookId)
}, 'nookDetails')

export const route = {
	preload({ params }) {
		void getNookDetailsCached(params.nook)
	},
} satisfies RouteDefinition

export default function NookLayout(props: RouteSectionProps) {
	const nookDetails = createAsync(
		async () => await getNookDetailsCached(props.params.nook),
	)
	return (
		<Show
			when={nookDetails() == null}
			fallback={
				<IsModProvider moderators={nookDetails()!.moderators}>
					<div class='flex'>
						<div class='grow'>{props.children}</div>
						<aside class='basis-40'>
							<Sidebar nook={props.params.nook!} nookDetails={nookDetails()!} />
						</aside>
					</div>
				</IsModProvider>
			}
		>
			<a href={`/nooks/create?nook=${props.params.nook ?? ''}`}>Create Nook</a>
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
					<a href={`/n/${props.nook}`} class='block text-lg font-bold'>
						/n/{props.nook}
					</a>
					<a href={`/n/${props.nook}/templates`} class='block'>
						Templates
					</a>
					<a href={`/n/${props.nook}/submit`} class='block'>
						Submit
					</a>
					<div>
						Est. <RelativeDate date={nd().created} />
					</div>
					<div>
						mods:
						<ol>
							<For each={nd().moderators}>
								{(mod) => (
									<li>
										<a href={`/u/${mod}`}>{mod}</a>
									</li>
								)}
							</For>
						</ol>
					</div>
				</>
			)}
		</Show>
	)
}
