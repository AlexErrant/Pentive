import { type NookId } from 'shared/brand'
import { getNook } from 'shared-edge'
import { query } from '@solidjs/router'

export const getNookDetailsCached = query(async (nook?: string) => {
	'use server'
	if (nook == null) return null // nook may be null when doing a redirect after nook creation; not sure why
	return await getNook(nook as NookId)
}, 'nookDetails')
