// lowTODO Intercept media requests like how `app` does and
// route them through the hub via Comlink, so only one request is made per Note-Media.
// As is, there may be multiple requests for a note media, depending on the number of iframes.

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)
