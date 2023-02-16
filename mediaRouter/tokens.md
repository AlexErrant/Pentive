# privateToken

Is basically a signed JWT - we're using HMAC for integrity https://security.stackexchange.com/a/63134

# publicToken

Is basically a server-side session (because it needs to support invalidation). lowTODO consider a hybrid approach like refresh tokens
