import { Show, Suspense } from 'solid-js'
import { type Base64Url } from 'shared/brand'
import { getPost } from 'shared-edge'
import {
	type RouteSectionProps,
	createAsync,
	type RouteDefinition,
	cache,
} from '@solidjs/router'

const getPostCached = cache(async (threadId: Base64Url) => {
	'use server'
	return await getPost(threadId)
}, 'posts')

export const route = {
	preload({ params }) {
		void getPostCached(params.threadId as Base64Url)
	},
} satisfies RouteDefinition

export default function Thread(props: RouteSectionProps) {
	const thread = createAsync(
		async () => await getPostCached(props.params.threadId as Base64Url),
	)
	return (
		<Suspense fallback={<p>Loading thread...</p>}>
			<Show when={thread()} fallback={<p>"404 Not Found"</p>}>
				<h1>{thread()!.title}</h1>
				<p>{thread()!.text}</p>
			</Show>
		</Suspense>
	)
}
