import express from "express"
import cors from "cors"
import visitorsRouter from "./routes/visitors"
import visitsRouter from "./routes/visits"

const app = express()
app.use(cors())
app.use(express.json())


app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.use("/api/visitors", visitorsRouter);
app.use("/api/visits", visitsRouter)

app.listen(4000, () => console.log("Backend running on port 4000"))