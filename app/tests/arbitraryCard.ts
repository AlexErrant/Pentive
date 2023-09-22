import fc from 'fast-check'
import {
	type Card,
	states,
	type CardId,
	type Ord,
	type NoteId,
	type CardSettingId,
	type DeckId,
} from 'shared'

import { reasonableDates, recordWithOptionalFields } from './arbitrary'

export const card = recordWithOptionalFields<Card>(
	{
		id: fc.uuidV(4).map((x) => x as CardId),
		noteId: fc.uuidV(4).map((x) => x as NoteId),
		deckIds: fc.array(fc.uuidV(4)).map((x) => new Set(x) as Set<DeckId>),
		created: reasonableDates,
		updated: reasonableDates,
		due: reasonableDates,
		ord: fc.integer().map((x) => x as Ord),
	},
	{
		cardSettingId: fc.uuidV(4).map((x) => x as CardSettingId),
		state: fc.constantFrom(...states),
	},
)
