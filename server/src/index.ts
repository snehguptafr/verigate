import express from "express"
import cors from "cors"
import { createServer } from "node:http"
import { Server } from "socket.io"
import visitorsRouter from "./routes/visitors"
import visitsRouter from "./routes/visits"
import usersRouter from "./routes/users"

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
})

app.use(cors())
app.use(express.json())

io.on("connection", socket => {
  console.log("Client connected")

  socket.on("join", (userId: string) => {
    socket.join(userId)
    console.log(`user ${userId} joined their room`)
  })

  socket.on("join-visit", (visitId: string) => {
    socket.join(`visit-${visitId}`)
    console.log(`Socket joined visit room: visit-${visitId}`)
  })

  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id)
  })
})


app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.use("/api/visitors", visitorsRouter);
app.use("/api/visits", visitsRouter)
app.use("/api/users", usersRouter)

httpServer.listen(4000, () => console.log("Backend running on port 4000"))