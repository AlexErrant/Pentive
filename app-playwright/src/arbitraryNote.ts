import fc from 'fast-check'
import type { NoteId, RemoteNoteId } from 'shared/brand'
import {
	arbitraryNookId,
	arbitraryUlid,
	reasonableDates,
	recordWithOptionalFields,
} from './arbitrary'
import type { NoteRemote, Note } from 'shared/domain/note'
import type { Template } from 'shared/domain/template'

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
				arbitraryNookId,
				fc.oneof(
					fc.constant(null),
					fc.record<NoteRemote>({
						remoteNoteId: arbitraryUlid<RemoteNoteId>(),
						uploadDate: reasonableDates,
					}),
				),
			),
		},
		{
			ankiNoteId: fc.integer(),
		},
	)
}
