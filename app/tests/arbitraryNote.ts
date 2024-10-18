import fc from 'fast-check'
import { type NoteId, type NookId, type RemoteNoteId } from 'shared/brand'
import {
	arbitraryUlid,
	reasonableDates,
	recordWithOptionalFields,
} from './arbitrary'
import { type Note } from 'shared/domain/note'

export const note = recordWithOptionalFields<Note>(
	{
		id: fc.uuidV(4).map((x) => x as NoteId),
		templateId: arbitraryUlid(),
		fieldValues: fc
			.dictionary(fc.string(), fc.string())
			.map((x) => new Map(Object.entries(x))),
		tags: fc.array(fc.string()).map((x) => new Set(x)),
		created: reasonableDates,
		edited: reasonableDates,
		remotes: fc
			.dictionary(
				fc.string(),
				fc.oneof(
					fc.constant(null),
					fc.record<{ remoteNoteId: RemoteNoteId; uploadDate: Date }>({
						remoteNoteId: arbitraryUlid<RemoteNoteId>(),
						uploadDate: fc.date(),
					}),
				),
			)
			.map(
				(x) =>
					new Map(
						Object.entries(x) as Array<
							[NookId, { remoteNoteId: RemoteNoteId; uploadDate: Date }]
						>,
					),
			),
	},
	{
		ankiNoteId: fc.integer(),
	},
)
