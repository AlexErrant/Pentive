import "./register-service-worker"
import { NoteId, Pointer, Side, TemplateId } from "app/src/domain/ids"
import contentWindowJs from "iframe-resizer/js/iframeResizer.contentWindow.js?raw" // https://vitejs.dev/guide/assets.html#importing-asset-as-string https://github.com/davidjbradshaw/iframe-resizer/issues/513
import { appMessenger } from "../appMessenger"

// https://stackoverflow.com/a/901144
const urlSearchParams = new URLSearchParams(window.location.search)

const { body, css } = await appMessenger.renderBody(
  urlSearchParams.get("side") as Side,
  urlSearchParams.get("templateId") as TemplateId,
  urlSearchParams.get("noteId") as NoteId,
  urlSearchParams.get("pointer") as Pointer
)

document.getElementsByTagName("body")[0].innerHTML = body
const resizeScript = document.createElement("script")
resizeScript.type = "text/javascript"
resizeScript.text = contentWindowJs
document.head.appendChild(resizeScript)
if (css != null) {
  const style = document.createElement("style")
  style.innerText = css
  document.head.appendChild(style)
}
