import {
	type VoidComponent,
	For,
	createResource,
	Switch,
	Match,
} from 'solid-js'
import { diffChars, diffJson, diffWords } from '../uiLogic/diff'
import { augcClient } from '../trpcClient'
import Diff from './diff'
import { zip } from '../domain/utility'
import DiffHtml from './diffHtml'
import DiffCss from './diffCss'
import { htmlTemplateLanguage } from 'shared-dom/language/htmlTemplateParser'
import { html } from '@codemirror/lang-html'
import { templateLinter } from 'shared-dom/language/templateLinter'
import { DiffModeToggleGroup } from './diffModeContext'
import './templateSync.css'
import { uploadTemplates } from '../domain/sync'
import type { TemplateRemote, Template } from 'shared/domain/template'
import type { NookId } from 'shared/brand'
import type { Standard, Cloze, ChildTemplate } from 'shared/schema'
import { Entries } from '@solid-primitives/keyed'
import { UploadEntry } from './uploadEntry'

const TemplateSync: VoidComponent<{ template: Template }> = (props) => {
	return (
		<>
			<DiffModeToggleGroup />
			<ul>
				<Entries of={props.template.remotes}>
					{(nookId, templateRemote) => (
						<li>
							<h2>/n/{nookId}</h2>
							<TemplateNookSync
								template={props.template}
								templateRemote={templateRemote()}
							/>
						</li>
					)}
				</Entries>
			</ul>
		</>
	)
}

export default TemplateSync

export const TemplateNookSync: VoidComponent<{
	template: Template
	templateRemote: TemplateRemote
	nook?: NookId
}> = (props) => {
	return (
		<UploadEntry
			remote={props.templateRemote}
			// eslint-disable-next-line solid/reactivity
			upload={async () => {
				await uploadTemplates(false, props.template.id, props.nook)
			}}
		>
			<TemplateNookSyncActual
				template={props.template}
				templateRemote={props.templateRemote}
			/>
		</UploadEntry>
	)
}

const TemplateNookSyncActual: VoidComponent<{
	template: Template
	templateRemote: TemplateRemote
}> = (props) => {
	const [remoteTemplate] = createResource(
		() => props.templateRemote?.remoteTemplateId,
		async (id) => await augcClient.getTemplate.query(id), // medTODO planetscale needs an id that associates all templates so we can lookup in 1 pass. Also would be useful to find "related" templates
	)
	return (
		<>
			<Diff
				title='Name'
				before={remoteTemplate()?.name}
				after={props.template.name}
				toChanges={diffChars}
			/>
			<Diff
				title='Fields'
				before={remoteTemplate()?.fields.join(', ')}
				after={props.template.fields.map((f) => f.name).join(', ')}
				toChanges={diffChars}
			/>
			<fieldset class='ctContainer border-black border p-1'>
				<legend>
					<span class='p-2 px-4 font-bold'>Child Templates</span>
				</legend>
				<div class='ctResults'>
					<Switch>
						<Match
							when={
								remoteTemplate() != null &&
								props.template.templateType.tag !==
									remoteTemplate()!.templateType.tag
							}
						>
							Your template is a {props.template.templateType.tag}, but the
							remote is a {remoteTemplate()!.templateType.tag}. I sure hope you
							know what you're doing...
							<Diff
								title='Child Template(s)'
								before={remoteTemplate()!.templateType}
								after={props.template.templateType}
								toChanges={diffJson}
							/>
						</Match>
						<Match when={props.template.templateType.tag === 'standard'}>
							<For
								each={zip(
									(props.template.templateType as Standard).templates,
									(remoteTemplate()?.templateType as Standard | null)
										?.templates ?? [],
								)}
							>
								{([localTemplate, remoteTemplate]) => (
									<ChildTemplateNookSync
										css={props.template.css}
										local={localTemplate}
										remote={remoteTemplate}
									/>
								)}
							</For>
						</Match>
						<Match when={props.template.templateType.tag === 'cloze'}>
							<ChildTemplateNookSync
								css={props.template.css}
								local={(props.template.templateType as Cloze).template}
								remote={
									(remoteTemplate()?.templateType as Cloze | null)?.template
								}
							/>
						</Match>
					</Switch>
				</div>
			</fieldset>
			<DiffCss before={remoteTemplate()?.css} after={props.template.css} />
		</>
	)
}

const extensions = [htmlTemplateLanguage, html().support, templateLinter]

const ChildTemplateNookSync: VoidComponent<{
	css: string
	local?: ChildTemplate
	remote?: ChildTemplate
}> = (props) => (
	<>
		<Diff
			title='Name'
			before={props.remote?.name}
			after={props.local?.name}
			toChanges={diffChars}
		/>
		<DiffHtml
			extensions={extensions}
			before={props.remote?.front}
			after={props.local?.front}
			css={props.css}
			title='Front'
		/>
		<DiffHtml
			extensions={extensions}
			before={props.remote?.back}
			after={props.local?.back}
			css={props.css}
			title='Back'
		/>
		<Diff
			title='Short Front'
			before={props.remote?.shortFront}
			after={props.local?.shortFront}
			toChanges={diffWords}
		/>
		<Diff
			title='Short Back'
			before={props.remote?.shortBack}
			after={props.local?.shortBack}
			toChanges={diffWords}
		/>
	</>
)
