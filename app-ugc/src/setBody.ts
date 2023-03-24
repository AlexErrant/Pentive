import contentWindowJs from "iframe-resizer/js/iframeResizer.contentWindow.js?raw" // https://vitejs.dev/guide/assets.html#importing-asset-as-string https://github.com/davidjbradshaw/iframe-resizer/issues/513
import { appMessenger } from "./appMessenger"
import { RenderBodyInput } from "app/src/customElements/resizingIframe"

export async function setBody(): Promise<void> {
  // https://stackoverflow.com/a/901144
  const urlSearchParams = new URLSearchParams(window.location.search)

  const { body, css } = await appMessenger.renderBody(
    Object.fromEntries(urlSearchParams) as RenderBodyInput
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
}
