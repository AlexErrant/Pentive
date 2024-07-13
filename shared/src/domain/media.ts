import { type MediaId } from '../brand.js'

export interface Media {
	id: MediaId
	created: Date
	edited: Date
	data: ArrayBuffer
	hash: ArrayBuffer
}
