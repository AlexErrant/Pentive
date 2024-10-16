import {
	type VoidComponent,
	For,
	Show,
	createResource,
	Switch,
	Match,
	createSignal,
} from 'solid-js'
import {
	type Template,
	objEntries,
	type RemoteTemplateId,
	type Standard,
	type Cloze,
	type ChildTemplate,
	type NookId,
} from 'shared'
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
import { type SyncState, uploadTemplates } from '../domain/sync'

const TemplateSync: VoidComponent<{ template: Template }> = (props) => {
	return (
		<>
			<DiffModeToggleGroup />
			<ul>
				<For each={objEntries(props.template.remotes)}>
					{([nookId, remoteTemplate]) => (
						<li>
							<h2>/n/{nookId}</h2>
							<TemplateNookSync
								template={props.template}
								remoteTemplate={remoteTemplate}
							/>
						</li>
					)}
				</For>
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
	const [state, setState] = createSignal<SyncState>('different')
	return (
		<>
			{state() === 'uploaded' ? (
				<div class='flex justify-end'>Uploaded</div>
			) : (
				<div class='pt-2 leading-normal'>
					<div class='flex justify-end'>
						<Switch>
							<Match when={state() === 'uploading'}>Uploading...</Match>
							<Match when={state() === 'different' || state() === 'errored'}>
								<>
									<Show when={state() === 'errored'}>
										<span class='pr-2'>Errored, try again?</span>
									</Show>
									<button
										class='border-gray-900 rounded-lg border px-2'
										onClick={async () => {
											setState('uploading')
											try {
												await uploadTemplates(props.template.id, props.nook)
											} catch (error) {
												setState('errored')
												throw error
											}
											setState('uploaded')
										}}
									>
										Upload
									</button>
								</>
							</Match>
						</Switch>
					</div>
					<Show
						when={props.remoteTemplate}
						fallback={<div>Not yet uploaded.</div>}
					>
						<TemplateNookSyncActual
							template={props.template}
							remoteTemplate={props.remoteTemplate!}
						/>
					</Show>
				</div>
			)}
		</>
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
			<div class='border-black border p-1'>
				<h3>Child Templates</h3>
				<Switch>
					<Match
						when={
							props.template.templateType.tag !==
							remoteTemplate()!.templateType.tag
						}
					>
						Your template is a {props.template.templateType.tag}, but the remote
						is a {remoteTemplate()!.templateType.tag}. I sure hope you know what
						you're doing...
						<Diff
							title='Child Template(s)'
							changes={diffJson(
								JSON.stringify(remoteTemplate()!.templateType),
								JSON.stringify(props.template.templateType),
							)}
						/>
					</Match>
					<Match when={props.template.templateType.tag === 'standard'}>
						<ul>
							<For
								each={zip(
									(props.template.templateType as Standard).templates,
									(remoteTemplate()!.templateType as Standard).templates,
								)}
							>
								{([localTemplate, remoteTemplate]) => (
									<li>
										<ChildTemplateNookSync
											css={props.template.css}
											local={localTemplate}
											remote={remoteTemplate}
										/>
									</li>
								)}
							</For>
						</ul>
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
