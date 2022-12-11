# tRPC on AWS Lambda

Use Node v16.13.0. [Link.](https://github.com/WiseLibs/better-sqlite3/issues/797#issuecomment-1116393307) If it continues to give you problems, run `pnpm rebuild`. (Note to self - `git clean -xdf` is insufficient.)

# serverless-offline + AWS Api Gateway Lambda

For running locally, this project uses `serverless` to run a mocked API gateway locally, which is invoked through `start-server`. Start the server with `yarn start-server`

Run the client with `yarn start-client`

## Run locally with serverless & serverless-offline

`$ yarn install`
`$ yarn build`
`$ yarn start-server`
`$ yarn start-client`

## REST API & HTTP API

Run the client with `yarn start-client`
