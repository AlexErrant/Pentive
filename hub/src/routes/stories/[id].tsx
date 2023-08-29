import {
	type Component,
	createResource,
	For,
	type Resource,
	Show,
} from 'solid-js'
import { A, type RouteDataArgs, useRouteData } from 'solid-start'
import Comment from '~/components/hnComment'
import fetchAPI from '~/lib/api'
import { type IStory } from '~/types'

export function routeData(props: RouteDataArgs): Resource<IStory> {
	const [story] = createResource<IStory, string>(
		() => `item/${props.params.id}`,
		fetchAPI,
	)
	return story
}

const Story: Component = () => {
	const story = useRouteData<typeof routeData>()
	return (
		<Show when={story()}>
			<div class='item-view'>
				<div class='item-view-header'>
					<A href={story()!.url} target='_blank'>
						<h1>{story()!.title}</h1>
					</A>
					<Show when={story()!.domain}>
						<span class='host'>({story()!.domain})</span>
					</Show>
					<p class='meta'>
						{story()!.points} points | by{' '}
						<A href={`/users/${story()!.user}`}>{story()!.user}</A>{' '}
						{story()!.timeAgo} ago
					</p>
				</div>
				<div class='item-view-comments'>
					<p class='item-view-comments-header'>
						{story()!.commentsCount !== 0
							? `${story()!.commentsCount} comments`
							: 'No comments yet.'}
					</p>
					<ul class='comment-children'>
						<For each={story()!.comments}>
							{(comment) => <Comment comment={comment} />}
						</For>
					</ul>
				</div>
			</div>
		</Show>
	)
}

export default Story
