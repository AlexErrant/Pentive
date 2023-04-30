import { type JSX } from "solid-js"
import { A } from "solid-start"

function Nav(): JSX.Element {
  return (
    <header class="header">
      <nav class="inner">
        <A href="/">
          <strong>Pentive</strong>
        </A>
        <A href={import.meta.env.VITE_APP_ORIGIN}>
          <strong>App</strong>
        </A>
        <a
          class="github"
          href="http://github.com/solidjs/solid"
          target="_blank"
          rel="noreferrer"
        >
          Built with Solid
        </a>
      </nav>
    </header>
  )
}

export default Nav
