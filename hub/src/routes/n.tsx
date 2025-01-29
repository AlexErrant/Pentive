import { For, Show, Suspense } from 'solid-js'
import {
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'
import RelativeDate from '~/components/relativeDate'
import { getNookDetailsCached } from '~/lib/useServer'
import { IsModProvider } from '~/components/isModContext'

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
		<IsModProvider moderators={nookDetails()?.moderators}>
			<div class='flex'>
				<div class='grow'>{props.children}</div>
				<aside class='basis-40'>
					<Suspense>
						<Show when={nookDetails()}>
							{(nd) => (
								<>
									<a
										href={`/n/${props.params.nook}`}
										class='block text-lg font-bold'
									>
										/n/{props.params.nook}
									</a>
									<a href={`/n/${props.params.nook}/templates`} class='block'>
										Templates
									</a>
									<a href={`/n/${props.params.nook}/submit`} class='block'>
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
					</Suspense>
				</aside>
			</div>
		</IsModProvider>
	)
}
