import { setBody } from './setBody'
import './registerServiceWorker'
import { hubMessenger } from './hubMessenger'

const i = await hubMessenger.renderBodyInput
setBody(i)

// https://stackoverflow.com/a/60949881
// not sure why `iframe-resizer` isn't resizing after images are loaded, since it seems to have coded related to loading images
// https://github.com/davidjbradshaw/iframe-resizer/blob/1ab689163f9e2505779b5f200b4f28adbddfc165/src/iframeResizer.contentWindow.js#L758
// but debugging it is annoying and slow, so this is the hacky fix
// grep 52496928-5C27-4057-932E-E0C3876AB26E
await Promise.all(
	Array.from(document.images)
		.filter((img) => !img.complete)
		.map(
			async (img) =>
				await new Promise((resolve) => {
					img.addEventListener('load', resolve)
					img.addEventListener('error', resolve)
				}),
		),
).then(async () => {
	await hubMessenger.resize()
})
