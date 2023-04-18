import { createSignal, type JSX } from "solid-js"

export default function Toggle(props: { children: JSX.Element }): JSX.Element {
  const [open, setOpen] = createSignal(true)

  return (
    <>
      <div class="toggle" classList={{ open: open() }}>
        <a onClick={() => setOpen((o) => !o)}>
          {open() ? "[-]" : "[+] comments collapsed"}
        </a>
      </div>
      <ul
        class="comment-children"
        style={{ display: open() ? "block" : "none" }}
      >
        {props.children}
      </ul>
    </>
  )
}
