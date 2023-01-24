// https://securityheaders.com/
// https://helmetjs.github.io/

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
// medTODO add to HSTS preload list https://hstspreload.org/
export const hstsName = "Strict-Transport-Security"
export const hstsValue = "max-age=63072000; includeSubDomains; preload" // 2 years
