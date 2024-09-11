import { type MediaId } from '../brand'

export interface Media {
	id: MediaId
	created: Date
	edited: Date
	data: ArrayBuffer
	hash: ArrayBuffer
}
