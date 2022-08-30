Pentive should avoid managing any passwords. This reduces the phishing attack vector, since a malicious plugin may display whatever it wishes. Instead, use [magic links](https://auth0.com/docs/authenticate/passwordless/authentication-methods/email-magic-link), [passwordless](https://auth0.com/docs/authenticate/passwordless) options, or a redirect to the app after an OAuth/SSO login (like Slack).

Offline only users do not need auth.

It should be possible to associate a _specific_ initially offline profile with an auth. Users may not wish to link all their offline profiles with an auth.
