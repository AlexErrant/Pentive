import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { sql, SQLite } from '@codemirror/lang-sql'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { oneDark } from '@codemirror/theme-one-dark'
import { useThemeContext } from 'shared-dom/themeSelector'
import { basicSetup } from 'shared-dom/codemirror'

const EditSql: VoidComponent<{
	run: (sql: string) => Promise<void>
}> = (props) => {
	let ref: HTMLDivElement
	let view: EditorView
	const [theme] = useThemeContext()
	onMount(() => {
		view = new EditorView({
			parent: ref,
			state: createEditorState(
				localStorage.getItem('sql') ?? '',
				theme(),
				props.run,
			),
		})
	})
	createEffect(
		on(theme, (t) => {
			view.setState(createEditorState(view.state.doc.toString(), t, props.run))
		}),
	)
	onCleanup(() => {
		view.destroy()
	})
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-4 font-bold'>SQL(ite)</span>
			</legend>
			<div class='h-[300px] resize-y overflow-auto' ref={ref!} />
		</fieldset>
	)
}

export default EditSql

function createEditorState(
	doc: string,
	theme: 'light' | 'dark',
	run: (sql: string) => Promise<void>,
) {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [
			keymap.of([
				{
					key: 'Ctrl-l',
					run: () => {
						console.clear()
						return true
					},
				},
				{
					key: 'Ctrl-Enter',
					run: (x) => {
						const selection = x.state.selection.ranges[0]
						let sql
						if (selection == null || selection.from === selection.to) {
							sql = x.state.doc.toString()
							localStorage.setItem('sql', sql)
						} else {
							sql = x.state.sliceDoc(selection.from, selection.to)
						}
						run(sql).catch(console.error)
						return true
					},
				},
			]),
			[...basicSetup],
			sql({ dialect: SQLite }),
			...maybeDark,
		],
	})
}
