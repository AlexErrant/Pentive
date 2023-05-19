import { commentText } from "shared"

export default function SubmitComment(props: {
  onSubmit: (text: string) => Promise<void>
}) {
  return (
    <main>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const text = commentText.parse(formData.get("comment"))
          // highTODO idempotency token
          await props.onSubmit(text)
        }}
      >
        <textarea name="comment" autocomplete="off" rows="4" cols="50" />
        <button type="submit">Submit</button>
      </form>
    </main>
  )
}
