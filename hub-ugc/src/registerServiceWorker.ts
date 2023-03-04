if ("serviceWorker" in navigator) {
  window.addEventListener("DOMContentLoaded", async () => {
    await navigator.serviceWorker.register("/serviceWorker.js")
  })
}
