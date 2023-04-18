self.addEventListener("fetch", (e) => {
  ;(e.request.url.includes("localhost") || e.request.url.includes("workers")) &&
    e.respondWith(
      caches.open("solid-hn").then((t) =>
        t.match(e.request).then(
          (n) =>
            n ||
            fetch(e.request).then(async (n) => {
              await t.put(e.request, n.clone())
              return n
            })
        )
      )
    )
})

self.addEventListener("activate", (e) => e.waitUntil(caches.delete("solid-hn")))
