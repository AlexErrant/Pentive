import { iframeResizer } from "iframe-resizer"
import contentWindowJs from "iframe-resizer/js/iframeResizer.contentWindow.js?raw" // https://vitejs.dev/guide/assets.html#importing-asset-as-string
import { VoidComponent } from "solid-js"

// eslint-disable-next-line @typescript-eslint/naming-convention
const ResizingIframe: VoidComponent<{
  readonly srcdoc: string
}> = (props) => {
  const srcdoc = props.srcdoc.replace(
    "<body>",
    `<body><script>${contentWindowJs}</script>` // lowTODO make `iframeResizer.contentWindow.js` a literal file in /public - could improve perf by making less work for the JS parser?
  )
  return (
    <iframe
      onload={(e) => {
        iframeResizer(
          {
            // log: true,

            // Don't need to remove event listeners as per https://github.com/davidjbradshaw/iframe-resizer/blob/master/docs/parent_page/methods.md

            // If perf becomes an issue consider debouncing https://github.com/davidjbradshaw/iframe-resizer/issues/816

            // lowTODO: Figure out how to inject the domain https://github.com/davidjbradshaw/iframe-resizer/blob/master/docs/parent_page/options.md#checkorigin
            // `import.meta.env.BASE_URL` could work with some elbow grease, but I'm too lazy to play with https://vitejs.dev/guide/build.html#public-base-path
            checkOrigin: false,
          },
          e.currentTarget
        )
      }}
      sandbox="allow-scripts" // Changing this has security ramifications! https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
      srcdoc={srcdoc} // It inherits the parent page's domain. Reconsider if you add `allow-same-origin` to `sandbox`! https://stackoverflow.com/a/41800811
    />
  )
}

export default ResizingIframe
