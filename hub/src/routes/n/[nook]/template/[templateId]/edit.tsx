import { type JSX, Show } from 'solid-js'
import { EditTemplate } from 'shared-dom/editTemplate'
import { defaultRenderContainer } from '~/lib/utility'
import {
	type NookId,
	type RemoteTemplateId,
	getDefaultTemplate as getDefaultTemplateOg,
	type Template,
	type TemplateId,
} from 'shared'
import {
	type RouteDefinition,
	cache,
	createAsync,
	type RouteSectionProps,
} from '@solidjs/router'
import { getTemplate } from 'shared-edge'
import { getUserId } from '~/session'
import { useThemeContext } from 'shared-dom/themeSelector'
import { useIsModContext } from '~/components/isModContext'

const getDefaultTemplate = () =>
	getDefaultTemplateOg(crypto.randomUUID() as TemplateId) // highTODO

const saveButton = (template: { template: Template }) => (
	<button onClick={async () => {}}>Save</button>
)

const getTemplateCached = cache(
	async (templateId: RemoteTemplateId, nook: NookId) => {
		'use server'
		return await getUserId().then(
			async (userId) =>
				await getTemplate(templateId, {
					userId: userId ?? undefined,
					nook,
				}),
		)
	},
	'template',
)

export const route = {
	preload({ params }) {
		void getTemplateCached(
			params.templateId as RemoteTemplateId,
			params.nook as NookId,
		)
	},
} satisfies RouteDefinition

export default function Edit(props: RouteSectionProps): JSX.Element {
	const isMod = useIsModContext()
	const template = createAsync(
		async () =>
			await getTemplateCached(
				props.params.templateId as RemoteTemplateId,
				props.params.nook as NookId,
			),
	)
	const [theme] = useThemeContext()
	return (
		<main>
			<h1>Edit Template</h1>
			<Show when={isMod()} fallback={<>You're not a mod.</>}>
				<Show when={template()}>
					<EditTemplate
						getDefaultTemplate={getDefaultTemplate}
						saveButton={saveButton}
						theme={theme()}
						renderContainer={defaultRenderContainer}
						template={{
							...template()!,
							remotes: {}, // unused
							fields: template()!.fields.map((f) => ({ name: f })),
						}}
					/>
				</Show>
			</Show>
		</main>
	)
}
