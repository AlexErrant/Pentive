import { Component, For, Show, createSignal } from "solid-js"
import { A } from "solid-start"
import { NoteComment as NoteCommentType } from "shared"
import Toggle from "./toggle"
import SubmitComment from "./submitComment"
import { apiClient } from "~/routes/apiClient"

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
      <div class="text" innerHTML={props.comment.text} />
      <button
        type="button"
        style={{ display: showReply() ? "none" : "block" }}
        onClick={() => setShowReply((o) => !o)}
      >
        Reply
      </button>
      <div style={{ display: showReply() ? "block" : "none" }}>
        <SubmitComment
          onSubmit={async (text) =>
            await apiClient.insertNoteChildComment.mutate({
              parentCommentId: props.comment.id,
              text,
            })
          }
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
