import fc from 'fast-check'
import {
	type CardId,
	type Ord,
	type NoteId,
	type CardSettingId,
} from 'shared/brand'
import { reasonableDates, recordWithOptionalFields } from './arbitrary'
import { type Card, states } from 'shared/domain/card'

export const card = recordWithOptionalFields<Card>(
	{
		id: fc.uuid({ version: 4 }).map((x) => x as CardId),
		noteId: fc.uuid({ version: 4 }).map((x) => x as NoteId),
		tags: fc.array(fc.uuid({ version: 4 })).map((x) => new Set(x)),
		created: reasonableDates,
		edited: reasonableDates,
		due: reasonableDates,
		lapses: fc.nat(),
		repCount: fc.nat(),
		ord: fc.integer().map((x) => x as Ord),
	},
	{
		cardSettingId: fc.uuid({ version: 4 }).map((x) => x as CardSettingId),
		state: fc.constantFrom(...states),
	},
)
