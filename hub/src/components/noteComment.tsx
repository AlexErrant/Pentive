import { Component, For, Show } from "solid-js"
import { A } from "solid-start"
import { NoteComment as NoteCommentType } from "shared"
import Toggle from "./toggle"

const NoteComment: Component<{ comment: NoteCommentType }> = (props) => {
  return (
    <li class="comment">
      <div class="by">
        <A href={`/users/${props.comment.authorId}`}>
          {props.comment.authorId}
        </A>{" "}
        {props.comment.updatedAt.toLocaleString()}
      </div>
      <div class="text" innerHTML={props.comment.text} />
      <Show when={props.comment.comments.length}>
        <Toggle>
          <For each={props.comment.comments}>
            {(comment) => <NoteComment comment={comment} />}
          </For>
        </Toggle>
      </Show>
    </li>
  )
}

export default NoteComment
