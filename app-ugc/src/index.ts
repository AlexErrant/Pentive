// https://stackoverflow.com/a/901144
const urlSearchParams = new URLSearchParams(window.location.search)
const params = Object.fromEntries(urlSearchParams.entries())

console.log("params:", params)
