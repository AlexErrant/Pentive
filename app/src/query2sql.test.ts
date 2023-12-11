import { expect, test } from 'vitest'
import { convert } from './query2sql'

test('SimpleString is fts', () => {
	const actual = convert('a')
	expect(actual).toEqual(
		"(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))",
	)
})

test('not a', () => {
	const actual = convert('-a')
	expect(actual).toEqual(
		"(noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))",
	)
})

test('2 SimpleStrings are ANDed', () => {
	const actual = convert('a b')
	expect(actual).toEqual(
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
AND
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
	)
})

test('2 SimpleStrings can be ORed', () => {
	const actual = convert('a OR b')
	expect(actual).toEqual(
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
OR
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
	)
})

test('2 SimpleStrings can be grouped', () => {
	const actual = convert('(a b)')
	expect(actual).toEqual(
		`(
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  AND
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})
