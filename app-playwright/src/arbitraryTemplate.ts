import fc from 'fast-check'
import {
	arbitraryNookId,
	arbitraryUlid,
	reasonableDates,
	recordWithOptionalFields,
} from './arbitrary'
import type { Ord, TemplateId, RemoteTemplateId } from 'shared/brand'
import type { TemplateRemote, Field, Template } from 'shared/domain/template'
import type { ChildTemplate, TemplateType } from 'shared/schema'

const field = recordWithOptionalFields<Field>(
	{
		name: fc.string(),
	},
	{
		rightToLeft: fc.boolean(),
		sticky: fc.boolean(),
		private: fc.boolean(),
	},
)

const childTemplate = recordWithOptionalFields<ChildTemplate>(
	{
		id: fc.integer().map((x) => x as Ord),
		name: fc.string(),
		front: fc.string(),
		back: fc.string(),
	},
	{
		shortFront: fc.string(),
		shortBack: fc.string(),
	},
)

const standardTemplateType = fc.record<TemplateType>({
	tag: fc.constant('standard'),
	templates: fc.array(childTemplate),
})

const clozeTemplateType = fc.record<TemplateType>({
	tag: fc.constant('cloze'),
	template: childTemplate,
})

const templateType = fc.oneof(standardTemplateType, clozeTemplateType)

export const template = recordWithOptionalFields<Template>(
	{
		id: fc.uuid({ version: 4 }).map((x) => x as TemplateId),
		name: fc.string(),
		css: fc.string(),
		fields: fc.array(field),
		created: reasonableDates,
		edited: reasonableDates,
		templateType,
		remotes: fc.dictionary(
			arbitraryNookId,
			fc.oneof(
				fc.constant(null),
				fc.record<TemplateRemote>({
					remoteTemplateId: arbitraryUlid<RemoteTemplateId>(),
					uploadDate: reasonableDates,
				}),
			),
		),
	},
	{},
)
