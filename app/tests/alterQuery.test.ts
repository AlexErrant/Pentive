import { expect, test } from 'vitest'
import { alterQuery } from '../src/domain/alterQuery'

test('adding tags to empty works', () => {
	const actual = alterQuery('', {
		tags: ['a', 'b'],
	})
	expect(actual).toEqual('tag:"a","b"')
})

test('adding tags to emptyish works', () => {
	const actual = alterQuery(' ', {
		tags: ['a', 'b'],
	})
	expect(actual).toEqual('tag:"a","b"')
})

test('adding tags to no-tags works', () => {
	const actual = alterQuery('x y', {
		tags: ['a', 'b'],
	})
	expect(actual).toEqual('x y tag:"a","b"')
})

test('adding tags to no-tags with space works', () => {
	const actual = alterQuery('x y ', {
		tags: ['a', 'b'],
	})
	expect(actual).toEqual('x y tag:"a","b"')
})

test('replacing tags with existing works', () => {
	const actual = alterQuery('a    tag:j,k,l   b       c  ', {
		tags: ['m', 'n'],
	})
	expect(actual).toEqual('a    tag:"m","n"   b       c  ')
})

test('ignores nested tags', () => {
	const actual = alterQuery(
		'  (d       e f tag:g,h,i) a    tag:j,k,l   b       c  (d       e f tag:g,h,i) ',
		{
			tags: ['m', 'n'],
		},
	)
	expect(actual).toEqual(
		'  (d       e f tag:g,h,i) a    tag:"m","n"   b       c  (d       e f tag:g,h,i) ',
	)
})

test('can delete tags', () => {
	const actual = alterQuery('x y tag:a,b z', {
		tags: [],
	})
	expect(actual).toEqual('x y  z')
})
