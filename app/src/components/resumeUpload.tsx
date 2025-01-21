import { type JSX } from 'solid-js'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { uploadNoteMedia, uploadTemplateMedia } from '../domain/sync'
import { createAsync } from '@solidjs/router'
import { uploadableNoteMedia, uploadableTemplateMedia } from '../sqlite/util'

export default function ResumeUpload(): JSX.Element {
	const uploadableMediaCount = createAsync(async () => {
		const [noteCount, templateCount] = await Promise.all([
			uploadableNoteMedia(true, undefined, true),
			uploadableTemplateMedia(true, undefined, true),
		])
		return noteCount + templateCount
	})
	return (
		<>
			Your upload of {uploadableMediaCount()} media files was interrupted.
			<button
				onClick={async () => {
					await uploadTemplateMedia(true)
					await uploadNoteMedia(true)
				}}
			>
				Resume Upload
			</button>
		</>
	)
}
