import fc, { type Arbitrary } from 'fast-check'
import { type CardSettingId } from 'shared/brand'
import { type Setting } from 'shared/domain/setting'
import { delimiter } from '../../app/src/sqlite/settings'

type ExtractGeneric<Type> = Type extends Arbitrary<infer X> ? X : never

const settingsPrimitive = fc.oneof(
	// 4CB24F8E-889C-472C-835A-A5A780C34963
	fc.string(),
	fc.double({
		noNaN: true,
		noDefaultInfinity: true,
	}),
	fc.boolean(),
	fc.constant(null),
)
const settingsValue = fc.oneof(settingsPrimitive, fc.array(settingsPrimitive))
const keyArb = fc
	.string({ minLength: 1 })
	.filter((x) => !x.includes(delimiter) && x !== '__proto__')
const depthIdentifier = fc.createDepthIdentifier()
const settingsValues = fc.letrec((tie) => ({
	self: fc.dictionary(
		keyArb,
		fc.oneof(
			{ depthIdentifier },
			settingsValue,
			tie('self') as Arbitrary<
				Record<string, ExtractGeneric<typeof settingsValue>>
			>,
		),
		{ depthIdentifier, minKeys: 1 },
	),
})).self

export const settings = settingsValues.chain((svs) =>
	fc
		.record({
			id: fc.uuid({ version: 4 }).map((x) => x as CardSettingId),
			name: fc.string(),
		})
		.map((idName) => Object.assign(svs, idName) satisfies Setting),
)
