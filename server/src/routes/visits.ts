import { Router } from "express"
import prisma from "../lib/prisma"
import { io } from "../index"

const router = Router()

router.post("/", async (req, res) => {
    const { tenantId, visitorId, hostId, purpose } = req.body;
    try {
        const visit = await prisma.visit.create({
            data: { tenantId, visitorId, hostId, purpose, status: "PENDING" },
            include: { visitor: true, host: true }
        })
        io.to(hostId).emit("visitor-arrived", visit)
        res.json(visit)
    } catch (e) {
        res.status(500).json({ error: "Failed to create visit", details: e })
    }
})

router.get("/", async (req, res) => {
    const { tenantId } = req.query;
    try {
        const visits = await prisma.visit.findMany({
            where: { tenantId: tenantId as string },
            include: { visitor: true, host: true }
        })
        res.json(visits)
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch visits" })
    }
})

export default router