import {
	type VoidComponent,
	For,
	Show,
	createResource,
	Switch,
	Match,
} from 'solid-js'
import { diffChars, diffCss, diffJson, diffWords } from 'diff'
import { augcClient } from '../trpcClient'
import Diff from './diff'
import { zip } from '../domain/utility'
import DiffHtml from './diffHtml'
import { htmlTemplateLanguage } from 'shared-dom/language/htmlTemplateParser'
import { html } from '@codemirror/lang-html'
import { templateLinter } from 'shared-dom/language/templateLinter'
import { DiffModeToggleGroup } from './diffModeContext'
import './templateSync.css'
import { uploadTemplates } from '../domain/sync'
import { type Template } from 'shared/domain/template'
import { type RemoteTemplateId, type NookId } from 'shared/brand'
import { type Standard, type Cloze, type ChildTemplate } from 'shared/schema'
import { Entries } from '@solid-primitives/keyed'
import { UploadEntry } from './uploadEntry'

const TemplateSync: VoidComponent<{ template: Template }> = (props) => {
	return (
		<>
			<DiffModeToggleGroup />
			<ul>
				<Entries of={props.template.remotes}>
					{(nookId, remoteTemplate) => (
						<li>
							<h2>/n/{nookId}</h2>
							<TemplateNookSync
								template={props.template}
								remoteTemplate={remoteTemplate()}
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
	remoteTemplate:
		| {
				remoteTemplateId: RemoteTemplateId
				uploadDate: Date
		  }
		| null
		| undefined
	nook?: NookId
}> = (props) => {
	return (
		<UploadEntry
			remote={props.remoteTemplate}
			// eslint-disable-next-line solid/reactivity
			upload={async () => {
				await uploadTemplates(props.template.id, props.nook)
			}}
		>
			<TemplateNookSyncActual
				template={props.template}
				remoteTemplate={props.remoteTemplate!}
			/>
		</UploadEntry>
	)
}

const TemplateNookSyncActual: VoidComponent<{
	template: Template
	remoteTemplate: {
		remoteTemplateId: RemoteTemplateId
		uploadDate: Date
	}
}> = (props) => {
	const [remoteTemplate] = createResource(
		() => props.remoteTemplate.remoteTemplateId,
		async (id) => await augcClient.getTemplate.query(id), // medTODO planetscale needs an id that associates all templates so we can lookup in 1 pass. Also would be useful to find "related" templates
	)
	return (
		<Show when={remoteTemplate()}>
			<Diff
				title='Name'
				changes={diffChars(remoteTemplate()!.name, props.template.name)}
			/>
			<Diff
				title='Css'
				changes={diffCss(remoteTemplate()!.css, props.template.css)}
			/>
			<Diff
				title='Fields'
				changes={diffWords(
					remoteTemplate()!.fields.join(', '),
					props.template.fields.map((f) => f.name).join(', '),
				)}
			/>
			<div class='ctContainer border-black border p-1'>
				<h3>Child Templates</h3>
				<div class='ctResults'>
					<Switch>
						<Match
							when={
								props.template.templateType.tag !==
								remoteTemplate()!.templateType.tag
							}
						>
							Your template is a {props.template.templateType.tag}, but the
							remote is a {remoteTemplate()!.templateType.tag}. I sure hope you
							know what you're doing...
							<Diff
								title='Child Template(s)'
								changes={diffJson(
									JSON.stringify(remoteTemplate()!.templateType),
									JSON.stringify(props.template.templateType),
								)}
							/>
						</Match>
						<Match when={props.template.templateType.tag === 'standard'}>
							<For
								each={zip(
									(props.template.templateType as Standard).templates,
									(remoteTemplate()!.templateType as Standard).templates,
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
								remote={(remoteTemplate()!.templateType as Cloze).template}
							/>
						</Match>
					</Switch>
				</div>
			</div>
		</Show>
	)
}

const extensions = [htmlTemplateLanguage, html().support, templateLinter]

const ChildTemplateNookSync: VoidComponent<{
	css: string
	local?: ChildTemplate
	remote?: ChildTemplate
}> = (props) => {
	return (
		<Switch
			fallback={
				<>
					<Diff
						title='Name'
						changes={diffChars(props.remote!.name, props.local!.name)}
					/>
					<DiffHtml
						extensions={extensions}
						before={props.remote!.front}
						after={props.local!.front}
						css={props.css}
						title='Front'
					/>
					<DiffHtml
						extensions={extensions}
						before={props.remote!.back}
						after={props.local!.back}
						css={props.css}
						title='Back'
					/>
				</>
			}
		>
			<Match when={props.local == null}>
				<h2>Deleted</h2>
				<pre>{JSON.stringify(props.remote, null, 4)}</pre>
			</Match>
			<Match when={props.remote == null}>
				<h2>Added</h2>
				<pre>{JSON.stringify(props.local, null, 4)}</pre>
			</Match>
		</Switch>
	)
}
