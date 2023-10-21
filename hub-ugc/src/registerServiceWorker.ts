if ('serviceWorker' in navigator) {
	// delay registration so it doesn't interfere with initial page render https://web.dev/articles/service-workers-registration#:~:text=Improving%20the%20boilerplate
	window.addEventListener('load', async () => {
		await navigator.serviceWorker.register('/serviceWorker.js')
	})
}
