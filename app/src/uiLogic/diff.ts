import {
	diffChars as diffCharsOg,
	diffCss as diffCssOg,
	diffJson as diffJsonOg,
	diffWords as diffWordsOg,
} from 'diff'

export const diffChars = (oldStr?: string, newStr?: string) =>
	diffCharsOg(oldStr ?? '', newStr ?? '')

export const diffCss = (oldStr?: string, newStr?: string) =>
	diffCssOg(oldStr ?? '', newStr ?? '')

export const diffJson = (oldObj?: string | object, newObj?: string | object) =>
	diffJsonOg(oldObj ?? '', newObj ?? '')

export const diffWords = (oldStr?: string, newStr?: string) =>
	diffWordsOg(oldStr ?? '', newStr ?? '')
