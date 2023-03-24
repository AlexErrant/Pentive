import fs from "fs"
import { ExpressPeerServer } from "peer"
import https from "https"
import express from "express"

const app = express()

const server = https.createServer(
  {
    key: fs.readFileSync(".cert/key.pem"),
    cert: fs.readFileSync(".cert/cert.pem"),
  },
  app
)

app.use("/", ExpressPeerServer(server))

server.listen(9000, "0.0.0.0", () => console.log("listening to 9000"))
