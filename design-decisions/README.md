This directory is similar to an [Architectural Decision Record](https://adr.github.io/), but with more emphasis on being current and up to date, rather than recording past decisions. If you wanna view the evolution of a decision, use git.

The primary author of Pentive, Alex, is _not_ a good architect, designer, or web dev. Please open an issue if you see areas for improvement!

# Service/Directory Overview

## app

- The client-side occasionally-online SRS program that stores a user's templates/notes/cards
- Where card reviews occur

## app-ugc

- A relatively small occasionally-online site that sandboxes untrusted user generated content - i.e. JavaScript in users' cards
- Has a service worker that queries `app` for media (e.g. images)

## hub

- The server-side always-online collaboration platform
- Where users may optionally upload notes for sharing

## hub-ugc

- Its raison d'être is the same as `app-ugc`'s
- Always-online, so it doesn't need `app-ugc`'s fancy service worker

## lrpc

- short for (AWS) Lambda-RPC
- Mostly empty for now, except for the Prisma/PlanetScale schema
- Server-side syncing may eventually be implemented here

## mediaRouter

- short for Cloudflare Worker API
- How `app` submits changes to `hub`/PlanetScale

## shared

- A library of shared code for the above services
