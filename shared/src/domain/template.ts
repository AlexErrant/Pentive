import type {
	Ord,
	RemoteTemplateId,
	TemplateId,
	NookId,
} from '../brand'
import type { TemplateType } from '../schema'

export interface Field {
	name: string
	rightToLeft?: boolean
	sticky?: boolean
	private?: boolean
}

export interface Template {
	id: TemplateId
	name: string // todo limit to 100
	css: string
	fields: Field[]
	created: Date
	edited: Date
	templateType: TemplateType
	remotes: Record<NookId, TemplateRemote>
}

export type TemplateRemote =
	| undefined // "not uploadable"
	| null // "marked for upload, but not yet uploaded"
	| { remoteTemplateId: RemoteTemplateId; uploadDate: Date }

export const getDefaultTemplate = (id: TemplateId): Template => ({
	id,
	name: 'New Template',
	css: '',
	fields: [
		{
			name: 'Front',
		},
		{
			name: 'Back',
		},
	],
	created: new Date(),
	edited: new Date(),
	templateType: {
		tag: 'standard',
		templates: [
			{
				id: 0 as Ord,
				name: 'My Template',
				front: '{{Front}}',
				back: `{{FrontSide}}<hr id=answer>{{Back}}`,
			},
		],
	},
	remotes: {},
})

export const getDefaultClozeTemplate = (id: TemplateId): Template => ({
	id,
	name: 'New Template',
	css: `.cloze-brackets-front {
    font-size: 150%%;
    font-family: monospace;
    font-weight: bolder;
    color: dodgerblue;
}
.cloze-filler-front {
    font-size: 150%%;
    font-family: monospace;
    font-weight: bolder;
    color: dodgerblue;
}
.cloze-brackets-back {
    font-size: 150%%;
    font-family: monospace;
    font-weight: bolder;
    color: red;
}`,
	fields: [
		{
			name: 'Text',
		},
		{
			name: 'Back Extra',
		},
	],
	created: new Date(),
	edited: new Date(),
	templateType: {
		tag: 'cloze',
		template: {
			id: 0 as Ord,
			name: 'My Template',
			front: '{{cloze:Text}}',
			back: `{{cloze:Text}}<br>{{Back Extra}}`,
		},
	},
	remotes: {},
})
