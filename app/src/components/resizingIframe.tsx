import { iframeResizer, type IFrameComponent } from "iframe-resizer"
import { createEffect, onCleanup, type VoidComponent } from "solid-js"
import * as Comlink from "comlink"
import {
  type Template,
  type Card,
  type Note,
  type Side,
  type MediaId,
} from "shared"
import { unwrap } from "solid-js/store"
import { db } from "../db"
import { C } from ".."

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582

export type RenderBodyInput =
  | {
      readonly tag: "template"
      readonly side: Side
      readonly template: Template
      readonly index: number
    }
  | {
      readonly tag: "card"
      readonly side: Side
      readonly card: Card
      readonly note: Note
      readonly template: Template
    }

async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
  const media = await db.getMedia(id)
  return media?.data ?? null
}

export interface AppExpose {
  renderTemplate: typeof C.renderTemplate
  html: typeof C.html
  getLocalMedia: typeof getLocalMedia
  renderBodyInput: RenderBodyInput
  resize: () => void
}

const ResizingIframe: VoidComponent<{
  readonly i: RenderBodyInput
}> = (props) => {
  let iframeReference: HTMLIFrameElement
  onCleanup(() => {
    ;(iframeReference as IFrameComponent)?.iFrameResizer?.close()
  })
  createEffect(() => {
    try {
      iframeReference?.contentWindow?.postMessage(
        { type: "pleaseRerender", i: unwrap(props.i) },
        targetOrigin
      )
    } catch (error) {
      console.error(error)
    }
  })
  return (
    <iframe
      ref={(x) => (iframeReference = x)}
      onLoad={(e) => {
        const appExpose: AppExpose = {
          renderTemplate: (x) => C.renderTemplate(x), // do not eta-reduce. `C`'s `this` binding apparently doesn't work across Comlink
          html: (x, y, z) => C.html(x, y, z), // do not eta-reduce. `C`'s `this` binding apparently doesn't work across Comlink
          getLocalMedia,
          renderBodyInput: unwrap(props.i),
          resize: () => {
            ;(iframeReference as IFrameComponent)?.iFrameResizer?.resize()
          },
        }
        Comlink.expose(
          appExpose,
          Comlink.windowEndpoint(
            e.currentTarget.contentWindow!,
            self,
            targetOrigin
          )
        )
        iframeResizer(
          {
            // log: true,

            // If perf becomes an issue consider debouncing https://github.com/davidjbradshaw/iframe-resizer/issues/816

            checkOrigin: [import.meta.env.VITE_APP_UGC_ORIGIN],
            sizeWidth: true,
            widthCalculationMethod: "max",
            heightCalculationMethod: "max",
          },
          e.currentTarget
        )
      }}
      sandbox="allow-scripts allow-same-origin" // Changing this has security ramifications! https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
      // "When the embedded document has the same origin as the embedding page, it is strongly discouraged to use both allow-scripts and allow-same-origin"
      // Since this iframe is hosted on `app-user-generated-content` and this component is hosted on `app`, resulting in different origins, we should be safe. https://web.dev/sandboxed-iframes/ https://stackoverflow.com/q/35208161
      src={import.meta.env.VITE_APP_UGC_ORIGIN}
    />
  )
}

export default ResizingIframe
