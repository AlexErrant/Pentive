import { type MediaId } from '../brand.js'

export interface Media {
	id: MediaId
	created: Date
	updated: Date
	data: ArrayBuffer
	hash: ArrayBuffer
}
