import { EditTemplate as EditTemplateOg } from 'shared-dom/editTemplate'
import { createSignal, type Setter, Show, type VoidComponent } from 'solid-js'
import { type SetStoreFunction } from 'solid-js/store'
import { useThemeContext } from 'shared-dom/themeSelector'
import { C } from '../topLevelAwait'
import { getDefaultTemplate } from '../domain/utility'
import { type Template } from 'shared/domain/template'
import { type NookId } from 'shared/brand'
import { Entries } from '@solid-primitives/keyed'
import { createMutation } from '@tanstack/solid-query'
import { useTemplatesTableContext } from './templatesTableContext'

type AddEdit = 'add' | 'edit'

const saveButton = (props: {
	template: Template
	type: AddEdit
	setTemplate: Setter<Template>
}) => {
	const [, setAdd] = useTemplatesTableContext().addTemplate
	const upsertTemplate = createMutation(() => ({
		mutationFn: async () => {
			await C.db.upsertTemplate(props.template)
		},
		onSuccess: () => {
			if (props.type === 'add') {
				props.setTemplate(getDefaultTemplate())
				setAdd(props.template)
			}
		},
	}))
	return (
		<button
			disabled={upsertTemplate.isPending}
			onClick={() => {
				upsertTemplate.mutate()
			}}
		>
			Save
		</button>
	)
}

function removeNook(
	nook: NookId,
	setTemplate: SetStoreFunction<{
		template: Template
	}>,
) {
	return (
		<button
			type='button'
			onClick={() => {
				setTemplate('template', 'remotes', (x) => ({ ...x, [nook]: undefined }))
			}}
		>
			❌
		</button>
	)
}

const remoteCell: VoidComponent<{
	template: Template
	setTemplate: SetStoreFunction<{
		template: Template
	}>
}> = (props) => {
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-2 font-bold'>Nooks</span>
			</legend>
			<ul>
				<Entries of={props.template.remotes}>
					{(nookId, remoteTemplate) => (
						<li class='px-4 py-2'>
							<Show when={remoteTemplate() != null} fallback={nookId}>
								<a
									href={`${import.meta.env.VITE_HUB_ORIGIN}/t/${
										remoteTemplate()!.remoteTemplateId
									}`}
								>
									{nookId}
								</a>
							</Show>
							{removeNook(nookId, props.setTemplate)}
						</li>
					)}
				</Entries>
			</ul>
			<input
				name='newNookId'
				class='w-75px form-input rounded-lg border p-1 text-sm'
				type='text'
				onChange={(e) => {
					props.setTemplate(
						'template',
						'remotes',
						e.currentTarget.value as NookId,
						null,
					)
				}}
			/>
		</fieldset>
	)
}

export const EditTemplate: VoidComponent<{
	template: Template
	type: AddEdit
}> = (props) => {
	const [theme] = useThemeContext()
	// eslint-disable-next-line solid/reactivity
	const [template, setTemplate] = createSignal(props.template)
	return (
		<EditTemplateOg
			getDefaultTemplate={getDefaultTemplate}
			saveButton={({ template }) =>
				saveButton({ template, setTemplate, type: props.type })
			}
			theme={theme()}
			renderContainer={C}
			template={template()}
			remoteCell={remoteCell}
		/>
	)
}
