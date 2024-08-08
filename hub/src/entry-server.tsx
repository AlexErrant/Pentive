// @refresh reload
import { createHandler, StartServer } from '@solidjs/start/server'

export default createHandler(() => {
	return (
		<StartServer
			document={({ assets, children, scripts }) => (
				<html lang='en'>
					<head>
						<title>Pentive</title>
						<meta charset='utf-8' />
						<meta
							name='viewport'
							content='width=device-width, initial-scale=1'
						/>
						<link rel='icon' href='/favicon.ico' />
						<meta
							name='description'
							content="A free, open source, offline-first spaced repetition system that has first class support for collaboration, curation, and plugins. It's Reddit for flashcards."
						/>
						<link rel='manifest' href='/manifest.webmanifest' />
						{assets}
						<script>
							{`
;(function () {
  // https://github.com/jjranalli/nightwind/pull/57/files
  function getInitialColorMode() {
    const persistedColorPreference =
      window.localStorage.getItem("nightwind-mode")
    const hasPersistedPreference =
      typeof persistedColorPreference === "string"
    if (hasPersistedPreference) {
      return persistedColorPreference
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const hasMediaQueryPreference = typeof mql.matches === "boolean"
    if (hasMediaQueryPreference) {
      return mql.matches ? "dark" : "light"
    }
    return "light"
  }
  function setTheme() {
    getInitialColorMode() == "light"
      ? document.documentElement.classList.remove("dark")
      : document.documentElement.classList.add("dark")
  }
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", setTheme)
  setTheme()
})()
`}
						</script>
					</head>
					<body class='text-black bg-white'>
						<iframe
							hidden
							style={{
								width: '0',
								height: '0',
								border: 'none',
								position: 'absolute',
							}}
							id='pentive-app-iframe'
							sandbox='allow-scripts allow-same-origin' // Changing this has security ramifications! https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
							// "When the embedded document has the same origin as the embedding page, it is strongly discouraged to use both allow-scripts and allow-same-origin"
							// Since this iframe hosts `app.pentive.com` and this page is hosted on `pentive.com`, resulting in different origins, we should be safe. https://web.dev/sandboxed-iframes/ https://stackoverflow.com/q/35208161
							src={import.meta.env.VITE_APP_ORIGIN + '/hubmessenger.html'}
						/>
						<div id='app'>{children}</div>
						{scripts}
					</body>
				</html>
			)}
		/>
	)
})
