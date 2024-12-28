import fc from 'fast-check'
import { type CardSettingId } from 'shared/brand'
import { type Setting } from 'shared/domain/setting'
import { delimiter } from '../../app/src/sqlite/util'

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
	.string()
	.filter((x) => !x.includes(delimiter) && x !== '__proto__')
const settingsValues = fc.dictionary(keyArb, settingsValue)

export const settings = settingsValues.chain((svs) =>
	fc
		.record({
			id: fc.uuid({ version: 4 }).map((x) => x as CardSettingId),
			name: fc.string(),
		})
		.map((idName) => Object.assign(svs, idName) satisfies Setting),
)
