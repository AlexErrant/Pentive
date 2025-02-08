import { type JSONSchema7 } from 'json-schema'
import { EditorState } from '@codemirror/state'
import { EditorView, hoverTooltip } from '@codemirror/view'
import { linter, lintGutter } from '@codemirror/lint'
import { json, jsonLanguage, jsonParseLinter } from '@codemirror/lang-json'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { oneDark } from '@codemirror/theme-one-dark'
import {
	jsonSchemaLinter,
	jsonSchemaHover,
	jsonCompletion,
	stateExtensions,
	handleRefresh,
} from 'codemirror-json-schema'
import Ajv from 'ajv'
import { C } from '../topLevelAwait'
import { useThemeContext } from 'shared-dom/themeSelector'
import { basicSetup } from 'shared-dom/codemirror'
import { type Setting } from 'shared/domain/setting'
import { userSettingId } from 'shared/brand'

const EditSetting: VoidComponent<{
	setting: Setting
	setSetting: (setting: Setting) => void
}> = (props) => {
	const schema = () =>
		props.setting.id === userSettingId
			? C.userSettingSchema
			: C.cardSettingSchema
	let ref!: HTMLDivElement
	let view: EditorView
	onMount(() => {
		const stringifiedSetting = () => JSON.stringify(props.setting, null, 2)
		const [theme] = useThemeContext()
		view = new EditorView({
			parent: ref,
			state: createEditorState(stringifiedSetting(), theme(), schema()),
		})
		createEffect(
			on(
				() => props.setting.id,
				() => {
					view.setState(
						createEditorState(stringifiedSetting(), theme(), schema()),
					)
				},
			),
		)
		createEffect(
			on(theme, (t) => {
				view.setState(createEditorState(stringifiedSetting(), t, schema()))
			}),
		)
		onCleanup(() => {
			view.destroy()
		})
	})
	return (
		<>
			<fieldset class='border-black border p-2'>
				<legend>
					<span class='p-2 px-4 font-bold'>JSON</span>
				</legend>
				<div class='h-full resize-y overflow-auto' ref={ref} />
			</fieldset>
			<button
				type='button'
				class='text-white bg-green-600 rounded p-2 px-4 font-bold hover:bg-green-700'
				onClick={async () => {
					let setting: Setting
					try {
						setting = JSON.parse(view.state.doc.toString()) as Setting
					} catch {
						C.toastError('Invalid JSON.')
						return
					}
					const validate = new Ajv({ allErrors: true }).compile(schema())
					if (validate(setting)) {
						props.setSetting(setting)
						await C.db.bulkUploadSettings([setting])
					} else {
						C.toastError(
							<>
								<div>Error in JSON</div>
								<pre>{JSON.stringify(validate.errors, null, 4)}</pre>
							</>,
						)
					}
				}}
			>
				Save
			</button>
		</>
	)
}

export default EditSetting

export const userSettingSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
		},
		name: {
			type: 'string',
		},
	},
	required: ['id', 'name'],
} satisfies JSONSchema7

export const cardSettingSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
		},
		name: {
			type: 'string',
		},
	},
	required: ['id', 'name'],
} satisfies JSONSchema7

function createEditorState(
	doc: string,
	theme: 'light' | 'dark',
	schema: JSONSchema7,
) {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [
			[...basicSetup],
			json(),
			...maybeDark,
			lintGutter(),
			linter(jsonParseLinter(), {
				delay: 300,
			}),
			linter(jsonSchemaLinter(), {
				needsRefresh: handleRefresh,
			}),
			jsonLanguage.data.of({
				autocomplete: jsonCompletion(),
			}),
			hoverTooltip(jsonSchemaHover()),
			stateExtensions(schema),
		],
	})
}
