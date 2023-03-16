# Some notes on writing/debugging Service Workers + iframes

- Use Chrome guest mode. It's easier to try everything with a clean state, and incognito mode has limitations.
- I couldn't figure out how to get [dev mode](https://vite-pwa-org.netlify.app/guide/development.html) working, so use `npm run build-watch` and `npm run serve` in both app and ugc
- Make sure your hosts file is updated as per [this doc](./../app/README.md).
- Service workers require `https`, so open
  - https://app.pentive.local:3014/
  - https://user-generated-content.pentive.local:3015/
- Open the iframe's domain in a new tab - i.e. go to the link above. Sometimes log messages will appear there.
- In both tabs, in DevTools > Application, check "Update on reload".

Despite all this, you'll run into inconsistent, transient, nondeterministic, non-reproducible behavior and errors.

Good luck, you poor SOB.

[Some "best practices".](https://www.thecodeship.com/web-development/guide-service-worker-pitfalls-best-practices/)
[Some more tips.](https://gist.github.com/mmazzarolo/e87a11d24f85b952ee30792316f56d47)

# Know the service worker lifecycle!

- https://web.dev/service-worker-lifecycle/
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#basic_architecture
