import { type Base64Url } from './brand'
import { throwExp } from './utility'

/*

`token` is `entityId` + `i`.

         token
 __________/\__________
/                      \
EqbOG7eOQ8edDQAAiBlWPA11
\_________  _________/\/
          \/           i
       entityId

*/

export function parsePublicToken(token: string): [Base64Url, number] {
	const entityId = token.substring(0, 22) as Base64Url
	// `token.substring(22)` yields values like `0.svg`
	// This works with parseInt because
	//   "If parseInt encounters a character that is not a numeral in the specified radix,
	//    it ignores it and all succeeding characters and returns the integer value parsed up to that point."
	//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
	const i = parseInt(token.substring(22), 10)
	if (isNaN(i)) {
		throwExp(`${i} is not a number.`)
	}
	return [entityId, i]
}
