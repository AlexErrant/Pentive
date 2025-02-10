import type { JSX } from 'solid-js'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { uploadNoteMedia, uploadTemplateMedia } from '../domain/sync'
import { createAsync } from '@solidjs/router'
import { uploadableNoteMedia, uploadableTemplateMedia } from '../sqlite/util'
import { createMutation, useQueryClient } from '@tanstack/solid-query'
import { C } from '../topLevelAwait'
import { throwExp } from 'shared/utility'

export default function ResumeUpload(): JSX.Element {
	const queryClient = useQueryClient()
	const upload = createMutation(() => ({
		mutationFn: async () => {
			const [, failedTemplateMediaIds] = await uploadTemplateMedia(true)
			if (failedTemplateMediaIds.length !== 0)
				throwExp('Failed uploading a Template media', {
					failedTemplateMediaIds,
				})
			const [, failedNoteMediaIds] = await uploadNoteMedia(true)
			if (failedNoteMediaIds.length !== 0)
				throwExp('Failed uploading a Note media', {
					failedNoteMediaIds,
				})
		},
		onSuccess: async () => {
			C.toastInfo('Upload of media files complete.')
			await queryClient.invalidateQueries({
				queryKey: ['uploadableMediaCount'],
			})
		},
	}))
	const uploadableMediaCount = createAsync(async () => {
		const [noteCount, templateCount] = await Promise.all([
			uploadableNoteMedia(true, undefined, true),
			uploadableTemplateMedia(true, undefined, true),
		])
		return noteCount + templateCount
	})
	return (
		<div class='flex h-screen flex-col items-center justify-center'>
			<div>
				Your upload of {uploadableMediaCount()} media files was interrupted.
			</div>
			<div>
				<button
					class='border-gray-900 rounded-lg border px-2'
					disabled={upload.isPending}
					onClick={async () => {
						await upload.mutateAsync()
					}}
				>
					{upload.isPending ? 'Uploading...' : 'Retry Upload'}
				</button>
			</div>
		</div>
	)
}
