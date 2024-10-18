import { type VoidComponent, For, Show, createEffect } from 'solid-js'
import { type SetStoreFunction, createStore } from 'solid-js/store'
import { Select } from '@thisbeyond/solid-select'
import { type ClozeTemplate, type StandardTemplate } from './cardHtml'
import EditChildTemplate from './editChildTemplate'
import '@thisbeyond/solid-select/style.css'
import './solidSelect.css'
import { EditTemplateCss } from './editTemplateCss'
import { type RenderContainer } from './renderContainer'
import { type Ord } from 'shared/brand'
import {
	type Template,
	getDefaultTemplate,
	getDefaultClozeTemplate,
} from 'shared/domain/template'
import { type ChildTemplate } from 'shared/schema'

interface ClozeTemplateStore {
	template: ClozeTemplate
}
interface StandardTemplateStore {
	template: StandardTemplate
}

export const EditTemplate: VoidComponent<{
	template: Template
	theme: 'light' | 'dark'
	renderContainer: RenderContainer
	saveButton: VoidComponent<{
		template: Template
	}>
	getDefaultTemplate: () => Template
	remoteCell?: VoidComponent<{
		template: Template
		setTemplate: SetStoreFunction<{
			template: Template
		}>
	}>
}> = (props) => {
	const [template, setTemplate] = createStore<{ template: Template }>({
		// eslint-disable-next-line solid/reactivity
		template: props.getDefaultTemplate(),
	})
	createEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- touch template.id so we setTemplate if template changes
		props.template.id
		setTemplate('template', props.template)
	})
	return (
		<>
			<Select
				class='bg-white'
				initialValue={props.template.templateType.tag}
				options={['standard', 'cloze']}
				onChange={(value: string) => {
					if (template.template.templateType.tag !== value) {
						setTemplate(
							'template',
							value === 'standard'
								? getDefaultTemplate(template.template.id)
								: getDefaultClozeTemplate(template.template.id),
						)
					}
				}}
			/>
			Name
			<input
				class='form-input w-full border'
				type='text'
				value={template.template.name}
				onInput={(e) => {
					setTemplate('template', 'name', e.currentTarget.value)
				}}
			/>
			<fieldset class='border-black border p-2'>
				<legend>
					<span class='p-2 px-4 font-bold'>Fields</span>
					<button
						class='py-1/2 text-white bg-green-600 m-2 rounded px-2 hover:bg-green-700'
						onClick={() => {
							setTemplate('template', 'fields', [
								...template.template.fields,
								{ name: 'New Field' },
							])
						}}
					>
						+
					</button>
				</legend>
				<For each={template.template.fields}>
					{(field, i) => {
						return (
							<input
								class='form-input w-full border'
								type='text'
								value={field.name}
								onInput={(e) => {
									setTemplate(
										'template',
										'fields',
										i(),
										'name',
										e.currentTarget.value,
									)
								}}
							/>
						)
					}}
				</For>
			</fieldset>
			{childTemplates(template, setTemplate, props)}
			<EditTemplateCss
				template={template.template}
				setTemplate={setTemplate}
				theme={props.theme}
			/>
			<Show when={props.remoteCell}>
				{props.remoteCell!({
					template: template.template,
					setTemplate,
				})}
			</Show>
			<props.saveButton template={template.template} />
		</>
	)
}

function childTemplates(
	template: {
		template: Template
	},
	setTemplate: SetStoreFunction<{
		template: Template
	}>,
	props: Parameters<typeof EditTemplate>[0],
) {
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<Show
					when={template.template.templateType.tag === 'standard'}
					fallback={<span class='p-2 px-4 font-bold'>Template</span>}
				>
					<span class='p-2 px-4 font-bold'>Child Templates</span>
					<button
						class='py-1/2 text-white bg-green-600 m-2 rounded px-2 hover:bg-green-700'
						onClick={() => {
							;(setTemplate as SetStoreFunction<StandardTemplateStore>)(
								'template',
								'templateType',
								'templates',
								(templates) => {
									const lastChildTemplate = templates.at(-1)!
									return [
										...templates,
										{
											id: (lastChildTemplate.id + 1) as Ord,
											name: lastChildTemplate.name + ' (2)',
											front: lastChildTemplate.front,
											back: lastChildTemplate.back,
										},
									]
								},
							)
						}}
					>
						+
					</button>
				</Show>
			</legend>
			<Show
				when={template.template.templateType.tag === 'standard'}
				fallback={
					<EditChildTemplate
						renderContainer={props.renderContainer}
						theme={props.theme}
						template={template.template}
						childTemplate={
							(template.template as ClozeTemplate).templateType.template
						}
						i={0}
						setTemplate={<K extends keyof ChildTemplate>(
							key: K,
							val: ChildTemplate[K],
						) => {
							;(setTemplate as SetStoreFunction<ClozeTemplateStore>)(
								'template',
								'templateType',
								'template',
								key,
								val,
							)
						}}
					/>
				}
			>
				<For
					each={(template.template as StandardTemplate).templateType.templates}
				>
					{(childTemplate, i) => {
						return (
							<EditChildTemplate
								renderContainer={props.renderContainer}
								theme={props.theme}
								template={template.template}
								childTemplate={childTemplate}
								i={i()}
								setTemplate={<K extends keyof ChildTemplate>(
									key: K,
									val: ChildTemplate[K],
								) => {
									;(setTemplate as SetStoreFunction<StandardTemplateStore>)(
										'template',
										'templateType',
										'templates',
										i(),
										key,
										val,
									)
								}}
							/>
						)
					}}
				</For>
			</Show>
		</fieldset>
	)
}
