import { readFile } from 'fs/promises'
import path from 'path'
import { expect, test } from 'vitest'
import type { TemplateId, Ord, PluginName, PluginVersion } from 'shared/brand'
import type { Template } from 'shared/domain/template'
import type { Plugin } from './plugin'
import { registerPluginServices } from './pluginManager'
import { strip } from './cardHtml'
import { getOk } from './cardHtml.test'
import { testRenderContainerArgs } from './testUtil'

function expectStrippedToBe(html: string, expected: string): void {
	const newline = /[\r\n]/g
	expect(strip(html).replace(newline, '').trim()).toBe(expected)
}

const clozeWithRequiredEdit: Template = {
	id: '' as TemplateId,
	name: '',
	created: new Date(),
	edited: new Date(),
	remotes: {},
	css: '',
	fields: [{ name: 'Text' }, { name: 'Extra' }],
	templateType: {
		tag: 'cloze' as const,
		template: {
			id: 0 as Ord,
			name: 'Cloze',
			front: '{{edit:cloze:Text}}',
			back: '{{edit:cloze:Text}}{{Extra}}',
		},
	},
}

function buildPlugin(src: string): Plugin {
	return {
		script: new Blob([src], {
			type: 'text/javascript',
		}),
		name: 'somePluginName' as string as PluginName,
		version: '0.0.0' as PluginVersion,
		created: new Date(),
		edited: new Date(),
	}
}

function expectTemplate(
	template: readonly [string, string] | null,
	expectedFront: string,
	expectedBack: string,
): void {
	expect(template).not.toBeNull()
	const [front, back] = template!
	expectStrippedToBe(front, expectedFront)
	expectStrippedToBe(back, expectedBack)
}

// the tests below require `tsc-build` to have been run - grep AD3A801F-81D4-4C83-80A3-94ED10F05608

test('renderTemplate works with plugin that requires `edit` syntax', async () => {
	const pluginText = await readFile(
		path.join(__dirname, '..', 'lib', 'src', 'cardHtml.plugin.testInput.js'),
		'utf8',
	)
	const plugin = buildPlugin(
		pluginText.replace('renderTemplate: renderTemplate(c),', ''),
	)
	const c = await registerPluginServices([plugin], testRenderContainerArgs)
	const templates = c.renderTemplate(clozeWithRequiredEdit)
	expect(templates.length).toBe(1)
	const template = getOk(templates[0]!)
	expectTemplate(
		template,
		'[EDITABLE]This is a cloze deletion for [ ... ] .[/EDITABLE]',
		'[EDITABLE]This is a cloze deletion for [ Text ] .[/EDITABLE](Extra)',
	)
})

test('renderTemplate works with plugin that requires `.bind(this)` because it indirectly calls its custom `edit` syntax', async () => {
	const pluginText = await readFile(
		path.join(__dirname, '..', 'lib', 'src', 'cardHtml.plugin.testInput.js'),
		'utf8',
	)
	const plugin = buildPlugin(pluginText)
	const c = await registerPluginServices([plugin], testRenderContainerArgs)
	const templates = c.renderTemplate(clozeWithRequiredEdit)
	expect(templates.length).toBe(1)
	const template = getOk(templates[0]!)
	expectTemplate(
		template,
		'[EDITABLE]THIS IS A CLOZE DELETION FOR [ ... ] .[/EDITABLE]',
		'[EDITABLE]THIS IS A CLOZE DELETION FOR [ TEXT ] .[/EDITABLE](EXTRA)',
	)
})

test('[EDITABLE] is missing since no `bind(this)`', async () => {
	const pluginText = await readFile(
		path.join(__dirname, '..', 'lib', 'src', 'cardHtml.plugin.testInput.js'),
		'utf8',
	)
	const plugin = buildPlugin(pluginText.replace('.bind(this)', ''))
	const c = await registerPluginServices([plugin], testRenderContainerArgs)
	const templates = c.renderTemplate(clozeWithRequiredEdit)
	expect(templates.length).toBe(1)
	const template = getOk(templates[0]!)
	expectTemplate(
		template,
		'THIS IS A CLOZE DELETION FOR [ ... ] .',
		'THIS IS A CLOZE DELETION FOR [ TEXT ] .(EXTRA)',
	)
})
