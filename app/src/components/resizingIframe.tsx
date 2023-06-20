import { iframeResizer, type IFrameComponent } from "iframe-resizer"
import { createEffect, on, onCleanup, type VoidComponent } from "solid-js"
import * as Comlink from "comlink"
import {
  type NoteId,
  type TemplateId,
  assertNever,
  type Side,
  type CardId,
  type MediaId,
  type NoteCard,
} from "shared"
import { C } from ".."
import { db } from "../db"

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582

export type RenderBodyInput =
  | {
      readonly tag: "template"
      readonly side: Side
      readonly templateId: TemplateId
      readonly index: string // string due to `new URLSearchParams()`, which expects everything to be a string.
    }
  | {
      readonly tag: "card"
      readonly side: Side
      readonly templateId: TemplateId
      readonly noteId: NoteId
      readonly cardId: CardId
    }
  | {
      readonly tag: "manualCard"
      readonly side: Side
    }

async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
  const media = await db.getMedia(id)
  return media?.data ?? null
}

export interface AppExpose {
  getLocalMedia: typeof getLocalMedia
  renderBody: (i: RenderBodyInput) => Promise<{ body: string; css?: string }>
  resize: () => void
}

const ResizingIframe: VoidComponent<{
  readonly i: RenderBodyInput
  readonly noteCard?: NoteCard
}> = (props) => {
  let iframeReference: HTMLIFrameElement
  onCleanup(() => {
    ;(iframeReference as IFrameComponent).iFrameResizer?.close()
  })
  createEffect(
    on(
      () => props.noteCard,
      () => {
        try {
          iframeReference.contentWindow!.postMessage(
            {
              type: "pleaseRerender",
            },
            targetOrigin
          )
        } catch (error) {
          console.error(error)
        }
      }
    )
  )
  const renderBody = async (
    i: RenderBodyInput
  ): Promise<{ body: string; css?: string }> => {
    switch (i.tag) {
      case "template": {
        const template = await db.getTemplate(i.templateId)
        if (template == null)
          return {
            body: `Template ${i.templateId} not found.`,
          }
        const result = C.renderTemplate({
          ...template,
          fields: template.fields,
        })[parseInt(i.index)]
        if (result == null) {
          return {
            body: `Error rendering Template ${i.templateId}: "${template.name}".`,
            css: template.css,
          }
        } else {
          return {
            body: i.side === "front" ? result[0] : result[1],
            css: template.css,
          }
        }
      }
      case "card": {
        const template = await db.getTemplate(i.templateId)
        const note = await db.getNote(i.noteId)
        const card = await db.getCard(i.cardId)
        if (template == null) {
          return { body: `Template ${i.templateId} not found!` }
        }
        if (note == null) {
          return { body: `Note ${i.noteId} not found!` }
        }
        if (card == null) {
          return { body: `Card ${i.cardId} not found!` }
        }
        const frontBack = C.html(card, note, template)
        if (frontBack == null) {
          return { body: "Card is invalid!" }
        }
        const body = i.side === "front" ? frontBack[0] : frontBack[1]
        return { body }
      }
      case "manualCard": {
        const { card, note, template } = props.noteCard!
        const frontBack = C.html(card, note, template)
        if (frontBack == null) {
          return { body: "Card is invalid!" }
        }
        const body = i.side === "front" ? frontBack[0] : frontBack[1]
        return { body }
      }
      default:
        return assertNever(i)
    }
  }

  return (
    <iframe
      ref={(x) => (iframeReference = x)}
      onLoad={(e) => {
        const appExpose: AppExpose = {
          getLocalMedia,
          renderBody,
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
      src={
        import.meta.env.VITE_APP_UGC_ORIGIN +
        `?` +
        new URLSearchParams(props.i).toString()
      }
    />
  )
}

export default ResizingIframe
