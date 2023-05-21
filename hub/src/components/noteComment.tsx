import { type Component, For, Show, createSignal } from "solid-js"
import { A } from "solid-start"
import { type NoteComment as NoteCommentType } from "shared-edge"
import Toggle from "./toggle"
import SubmitComment from "./submitComment"
import { cwaClient } from "~/routes/cwaClient"

const NoteComment: Component<{ comment: NoteCommentType }> = (props) => {
  const [showReply, setShowReply] = createSignal(false)
  return (
    <li class="comment">
      <div class="by">
        <A href={`/users/${props.comment.authorId}`}>
          {props.comment.authorId}
        </A>{" "}
        {props.comment.updated.toLocaleString()}
      </div>
      <div class="text">{props.comment.text}</div>
      <button
        type="button"
        style={{ display: showReply() ? "none" : "block" }}
        onClick={() => setShowReply((o) => !o)}
      >
        Reply
      </button>
      <div style={{ display: showReply() ? "block" : "none" }}>
        <SubmitComment
          // eslint-disable-next-line solid/reactivity -- doesn't need to be reactive
          onSubmit={async (text) => {
            await cwaClient.insertNoteChildComment.mutate({
              parentCommentId: props.comment.id,
              text,
            })
          }}
        />
      </div>
      <Show when={props.comment.comments.length}>
        <Toggle>
          <div class="comment-children">
            <For each={props.comment.comments}>
              {(comment) => <NoteComment comment={comment} />}
            </For>
          </div>
        </Toggle>
      </Show>
    </li>
  )
}

export default NoteComment
