import fc from 'fast-check'
import {
	type Card,
	states,
	type CardId,
	type Ord,
	type NoteId,
	type CardSettingId,
} from 'shared'

import { reasonableDates, recordWithOptionalFields } from './arbitrary'

export const card = recordWithOptionalFields<Card>(
	{
		id: fc.uuidV(4).map((x) => x as CardId),
		noteId: fc.uuidV(4).map((x) => x as NoteId),
		tags: fc.array(fc.uuidV(4)).map((x) => new Set(x)),
		created: reasonableDates,
		edited: reasonableDates,
		due: reasonableDates,
		lapses: fc.nat(),
		repCount: fc.nat(),
		ord: fc.integer().map((x) => x as Ord),
	},
	{
		cardSettingId: fc.uuidV(4).map((x) => x as CardSettingId),
		state: fc.constantFrom(...states),
	},
)
