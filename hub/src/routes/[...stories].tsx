import { type Component, createResource, For, type JSX, Show } from 'solid-js'
import { A, type RouteDataArgs, useRouteData } from 'solid-start'
import Story from '~/components/story'
import fetchAPI from '~/lib/api'
import { type IStory } from '~/types'

const mapStories = {
	top: 'news',
	new: 'newest',
	show: 'show',
	ask: 'ask',
	job: 'jobs',
} as const

/* eslint-disable */
export function routeData({ location, params }: RouteDataArgs) {
	const page = () => +location.query.page! || 1
	const type = () => (params.stories || 'top') as keyof typeof mapStories
	/* eslint-enable */

	const [stories] = createResource<IStory[], string>(
		() => `${mapStories[type()]}?page=${page()}`,
		fetchAPI,
	)

	return { type, stories, page }
}

const Stories: Component = () => {
	const { page, type, stories } = useRouteData<typeof routeData>()
	return (
		<div class='news-view'>
			<div class='news-list-nav'>
				<Show
					when={page() > 1}
					fallback={
						<span class='page-link disabled' aria-disabled='true'>
							{'<'} prev
						</span>
					}
				>
					<A
						class='page-link'
						href={`/${type()}?page=${page() - 1}`}
						aria-label='Previous Page'
					>
						{'<'} prev
					</A>
				</Show>
				<span>page {page()}</span>
				<Show
					when={stories() != null && stories()!.length >= 29}
					fallback={
						<span class='page-link disabled' aria-disabled='true'>
							more {'>'}
						</span>
					}
				>
					<A
						class='page-link'
						href={`/${type()}?page=${page() + 1}`}
						aria-label='Next Page'
					>
						more {'>'}
					</A>
				</Show>
			</div>
			<main class='news-list'>
				<Show when={stories()}>
					<ul>
						<For each={stories()}>
							{(story): JSX.Element => <Story story={story} />}
						</For>
					</ul>
				</Show>
			</main>
		</div>
	)
}

export default Stories
