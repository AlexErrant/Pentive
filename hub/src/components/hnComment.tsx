import { type Component, For, Show } from 'solid-js'
import { A } from '@solidjs/router'
import type { CommentDefinition } from '~/types'
import Toggle from './toggle'

const HNComment: Component<{ comment: CommentDefinition }> = (props) => {
	return (
		<li class='comment'>
			<div class='by'>
				<A href={`/users/${props.comment.user}`}>{props.comment.user}</A>{' '}
				{props.comment.time_ago} ago
			</div>
			<div class='text'>{props.comment.content}</div>
			<Show when={props.comment.comments.length}>
				<Toggle>
					<For each={props.comment.comments}>
						{(comment) => <HNComment comment={comment} />}
					</For>
				</Toggle>
			</Show>
		</li>
	)
}

export default HNComment
