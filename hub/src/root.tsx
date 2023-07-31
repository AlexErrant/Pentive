// @refresh reload
import { Suspense } from "solid-js"
import { type JSX } from "solid-js/web/types/jsx"
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Link,
  Meta,
  Routes,
  Scripts,
  Title,
} from "solid-start"
import Nav from "./components/nav"
import "./root.css"
import type { appExpose } from "app/src/index"
import * as Comlink from "comlink"
import { throwExp } from "shared"
import nightwind from "nightwind/helper"

let appMessenger: Comlink.Remote<typeof appExpose> | null

export function getAppMessenger() {
  if (appMessenger == null) {
    const pai = document.getElementById(
      "pentive-app-iframe"
    ) as HTMLIFrameElement
    if (pai.contentWindow == null)
      throwExp("Unable to find the pentive app iframe.")
    appMessenger = Comlink.wrap<typeof appExpose>(
      Comlink.windowEndpoint(pai.contentWindow)
    )
  }
  return appMessenger
}

export default function Root(): JSX.Element {
  return (
    <Html lang="en">
      <Head>
        <Title>Pentive</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta
          name="description"
          content="A free, open source, offline-first spaced repetition system that has first class support for collaboration, curation, and plugins. It's Reddit for flashcards."
        />
        <Link rel="manifest" href="/manifest.webmanifest" />
        <script>{nightwind.init()}</script>
      </Head>
      <Body class="bg-white text-black">
        <iframe
          hidden
          style={{
            width: "0",
            height: "0",
            border: "none",
            position: "absolute",
          }}
          id="pentive-app-iframe"
          sandbox="allow-scripts allow-same-origin" // Changing this has security ramifications! https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
          // "When the embedded document has the same origin as the embedding page, it is strongly discouraged to use both allow-scripts and allow-same-origin"
          // Since this iframe hosts `app.pentive.com` and this page is hosted on `pentive.com`, resulting in different origins, we should be safe. https://web.dev/sandboxed-iframes/ https://stackoverflow.com/q/35208161
          src={import.meta.env.VITE_APP_ORIGIN}
        />
        <ErrorBoundary>
          <Suspense fallback={<div class="news-list-nav">Loading...</div>}>
            <Nav />
            <Routes>
              <FileRoutes />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <Scripts />
      </Body>
    </Html>
  )
}

// if (import.meta.env.PROD && !isServer && "serviceWorker" in navigator) {
//   // Use the window load event to keep the page load performant
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register(`/sw.js`);
//   });
// }
