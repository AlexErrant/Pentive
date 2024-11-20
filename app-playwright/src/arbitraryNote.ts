import fc from 'fast-check'
import { type NoteId, type RemoteNoteId } from 'shared/brand'
import {
	arbitraryUlid,
	reasonableDates,
	recordWithOptionalFields,
} from './arbitrary'
import { type Note } from 'shared/domain/note'
import { type Template } from 'shared/domain/template'

export function note(template: Template) {
	return recordWithOptionalFields<Note>(
		{
			id: fc.uuid({ version: 4 }).map((x) => x as NoteId),
			templateId: fc.constant(template.id),
			fieldValues: fc
				.constant(template)
				.map((t) => t.fields.map((f) => f.name))
				.chain((fieldNames) =>
					fc
						.array(fc.string(), {
							minLength: fieldNames.length,
							maxLength: fieldNames.length,
						})
						.map((values) =>
							Object.fromEntries(
								values.map((value, i) => [fieldNames[i]!, value] as const),
							),
						),
				),
			tags: fc.array(fc.string()).map((x) => new Set(x)),
			created: reasonableDates,
			edited: reasonableDates,
			remotes: fc.dictionary(
				fc.string(),
				fc.oneof(
					fc.constant(null),
					fc.record<{ remoteNoteId: RemoteNoteId; uploadDate: Date }>({
						remoteNoteId: arbitraryUlid<RemoteNoteId>(),
						uploadDate: fc.date(),
					}),
				),
			),
		},
		{
			ankiNoteId: fc.integer(),
		},
	)
}
