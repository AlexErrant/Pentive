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
} from './typeChecker'
import _ from 'lodash'
import { toastFatal, toastImpossible } from '../../components/toasts'

function parseField(fld: Fld): Field {
	return {
		name: fld.name,
		rightToLeft: fld.rtl,
		sticky: fld.sticky,
	}
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
				toastImpossible(
					`Cloze template have only 1 template, but got ${model.tmpls.length}`,
				)
			const tmpl = model.tmpls[0]!
			return {
				tag: 'cloze',
				template: parseChildTemplate(tmpl),
			}
		}
		default:
			toastImpossible(
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
			created: new Date(m.id),
			updated: new Date(m.mod * 1000),
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
	if (template == null) toastFatal(`Template ${templateId} not found`)
	const fields = template.fields.map((f) => f.name)
	const values = note.flds.split('\x1f')
	if (fields.length !== values.length)
		toastFatal(
			`The length of fields (${fields.length}) and values (${values.length}) for noteId=${note.id} don't match.`,
		)
	return {
		id: note.id.toString() as NoteId, // medTODO
		created: new Date(note.id),
		updated: new Date(note.mod),
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
): PCard {
	const note = notes.get(card.nid)
	if (note == null) toastFatal(`Note ${card.nid} not found`)
	const template = templates.get(note.templateId)
	if (template == null) toastFatal(`Template ${note.templateId} not found`)
	const deck = decks[card.did] ?? toastFatal(`Deck ${card.did} not found`)
	return {
		id: card.id.toString() as CardId, // medTODO
		noteId: card.nid.toString() as NoteId, // medTODO
		tags: new Set(['Deck/' + normalize(deck.name)]),
		created: new Date(card.id),
		updated: new Date(card.mod),
		due: new Date(card.due), // highTODO
		cardSettingId: deck.conf.toString() as CardSettingId,
		ord: card.ord,
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
		created: new Date(id),
		rating: ease,
		kind: type, // changing the name so its easier to grep - `type` is overloaded.
	}
}

export function parseCardSetting(dconf: Dconf) {
	return Array.from(Object.entries(dconf)).map(([id, rest]) => ({
		...rest,
		id: id as CardSettingId,
	}))
}
