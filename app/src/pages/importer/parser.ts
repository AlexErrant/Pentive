import {
	type CardId,
	type Ord,
	type NoteId,
	type TemplateId,
	type ChildTemplate,
	type TemplateType,
	type CardSettingId,
	type Field,
	type Template,
	type Card as PCard,
	type Note as PNote,
	type Review,
	type ReviewId,
	type Kind,
	throwExp,
	dayInMs,
} from 'shared'
import {
	type Card as ACard,
	type Fld,
	type Model,
	type Models,
	type Note as ANote,
	type Tmpl,
	type Revlog,
	type Dconf,
	type Decks,
	dconfSingle,
} from './typeChecker'
import _ from 'lodash'
import { z } from 'zod'
import { C } from '../../topLevelAwait'

function parseField(fld: Fld): Field {
	return {
		name: fld.name,
		rightToLeft: fld.rtl,
		sticky: fld.sticky,
	}
}

function newDate(i: number) {
	const d = new Date(i)
	if (isNaN(+d)) {
		// https://stackoverflow.com/q/1353684#comment131454756_67410020
		throwExp('Invalid date: ' + i)
	}
	return d
}

function parseChildTemplate(tmpl: Tmpl): ChildTemplate {
	return {
		id: tmpl.ord as Ord,
		name: tmpl.name,
		front: tmpl.qfmt,
		back: tmpl.afmt,
		shortFront: tmpl.bqfmt,
		shortBack: tmpl.bafmt,
	}
}

function parseTemplateType(model: Model): TemplateType {
	switch (model.type) {
		case 0:
			return {
				tag: 'standard',
				templates: model.tmpls.map(parseChildTemplate),
			}
		case 1: {
			if (model.tmpls.length !== 1)
				C.toastImpossible(
					`Cloze template have only 1 template, but got ${model.tmpls.length}`,
				)
			const tmpl = model.tmpls[0]!
			return {
				tag: 'cloze',
				template: parseChildTemplate(tmpl),
			}
		}
		default:
			return C.toastImpossible(
				`Only 0 or 1 are possible model types, but got ${model.type}`,
			)
	}
}

export function parseTemplates(models: Models): Template[] {
	return Object.entries(models).map(([, m]) => {
		return {
			id: m.id.toString() as TemplateId, // medTODO
			name: m.name,
			css: m.css,
			fields: m.flds.map(parseField),
			created: newDate(m.id),
			edited: newDate(m.mod * 1000),
			templateType: parseTemplateType(m),
			ankiId: m.id,
			remotes: {},
		}
	})
}

const normalize = (s: string) =>
	s.trim().replaceAll('::', '/').replaceAll('_', ' ')

export function parseNote(
	note: ANote,
	templates: Map<TemplateId, Template>,
): PNote {
	const templateId = note.mid.toString() as TemplateId // medTODO
	const template = templates.get(templateId)
	if (template == null) return C.toastFatal(`Template ${templateId} not found`)
	const fields = template.fields.map((f) => f.name)
	const values = note.flds.split('\x1f')
	if (fields.length !== values.length)
		C.toastFatal(
			`The length of fields (${fields.length}) and values (${values.length}) for noteId=${note.id} don't match.`,
		)
	return {
		id: note.id.toString() as NoteId, // medTODO
		created: newDate(note.id),
		edited: newDate(note.mod),
		ankiNoteId: note.id,
		templateId,
		fieldValues: new Map(_.zip(fields, values) as Array<[string, string]>),
		tags: new Set(
			note.tags
				.split(' ')
				.map(normalize)
				.filter((t) => t !== ''),
		),
		remotes: new Map(),
	}
}

export function parseCard(
	card: ACard,
	notes: Map<number, PNote>,
	templates: Map<TemplateId, Template>,
	decks: Decks,
	colCrtMs: number,
): PCard {
	const note = notes.get(card.nid)
	if (note == null) return C.toastFatal(`Note ${card.nid} not found`)
	const template = templates.get(note.templateId)
	if (template == null)
		return C.toastFatal(`Template ${note.templateId} not found`)
	const deck = decks[card.did] ?? C.toastFatal(`Deck ${card.did} not found`)
	return {
		id: card.id.toString() as CardId, // medTODO
		noteId: card.nid.toString() as NoteId, // medTODO
		tags: new Set(['Deck/' + normalize(deck.name)]),
		created: newDate(card.id),
		edited: newDate(card.mod),
		due: parseDue(card.due, card.type, colCrtMs),
		lapses: card.lapses,
		repCount: card.reps,
		cardSettingId: deck.conf.toString() as CardSettingId,
		ord: card.ord,
	}
}

function parseDue(due: number, type: number, colCrtMs: number): Date | number {
	if (type === 0) {
		// new
		return due
	} else if (type === 1 || type === 3) {
		// learning || relearning
		return newDate(due * 1000)
	} else if (type === 2) {
		// review
		return newDate(due * dayInMs + colCrtMs)
	} else {
		throwExp('Unhandled type: ' + type)
	}
}

export function parseRevlog({
	id,
	cid,
	ease,
	type,
	...revlog
}: Revlog): Review {
	return {
		...revlog,
		cardId: cid.toString() as CardId, // highTODO
		id: id.toString() as ReviewId, // highTODO
		created: newDate(id),
		rating: ease,
		kind: convertType(type), // changing the name so its easier to grep - `type` is overloaded.
	}
}

function convertType(s: number): Kind {
	switch (s) {
		case 0:
			return 'learn'
		case 1:
			return 'review'
		case 2:
			return 'relearn'
		case 3:
			return 'filtered'
		case 4:
			return 'manual'
		default:
			return C.toastImpossible(`Expected 0, 1, 2, 3, or 4, but got ${s}`)
	}
}

export function parseCardSetting(dconf: Dconf): CardSetting[] {
	return Array.from(Object.entries(dconf)).map(([id, rest]) => ({
		...rest,
		id: id as CardSettingId,
	}))
}

export const cardSetting = dconfSingle.merge(
	z.object({ id: z.string() as unknown as z.Schema<CardSettingId> }),
)

export type CardSetting = z.infer<typeof cardSetting>
