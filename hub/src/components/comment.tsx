import { type Component, For, Show, createSignal } from 'solid-js'
import type { Comment as CommentType } from 'shared-edge'
import Toggle from './toggle'
import SubmitComment from './submitComment'
import { cwaClient } from '~/routes/cwaClient'
import type { Base64Url } from 'shared/brand'
import { A } from '@solidjs/router'
import '@github/relative-time-element'
import RelativeTime from './relativeTime'

const Comment: Component<{
	comment: CommentType<Base64Url>
	type: 'note' | 'template'
}> = (props) => {
	const [showReply, setShowReply] = createSignal(false)
	return (
		<li class='comment'>
			<div class='by'>
				<A href={`/users/${props.comment.authorId}`}>
					{props.comment.authorId}
				</A>{' '}
				<RelativeTime date={props.comment.edited} />
			</div>
			<div class='text'>{props.comment.text}</div>
			<button
				type='button'
				classList={{ hidden: showReply(), block: !showReply() }}
				onClick={() => setShowReply((o) => !o)}
			>
				Reply
			</button>
			<div classList={{ block: showReply(), hidden: !showReply() }}>
				<SubmitComment
					// eslint-disable-next-line solid/reactivity -- doesn't need to be reactive
					onSubmit={async (text) => {
						if (props.type === 'note') {
							await cwaClient.insertNoteChildComment.mutate({
								parentCommentId: props.comment.id,
								text,
							})
						} else {
							await cwaClient.insertTemplateChildComment.mutate({
								parentCommentId: props.comment.id,
								text,
							})
						}
					}}
				/>
			</div>
			<Show when={props.comment.comments.length}>
				<Toggle>
					<div class='comment-children'>
						<For each={props.comment.comments}>
							{(comment) => <Comment comment={comment} type={props.type} />}
						</For>
					</div>
				</Toggle>
			</Show>
		</li>
	)
}

export default Comment
