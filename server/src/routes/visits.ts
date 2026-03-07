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

router.patch("/:id/status", async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  try {
    const visit = await prisma.visit.update({
      where: { id },
      data: { status },
      include: { visitor: true, host: true }
    })

    // notify the kiosk that status changed
    io.to(`visit-${id}`).emit("visit-status-updated", visit)

    res.json(visit)
  } catch (e) {
    res.status(500).json({ error: "Failed to update visit status" })
  }
})

router.get("/host/:hostId", async (req, res) => {
  const { hostId } = req.params
  try {
    const visits = await prisma.visit.findMany({
      where: {
        hostId,
        status: { in: ["PENDING", "APPROVED", "DENIED"] }
      },
      include: { visitor: true, host: true },
      orderBy: { checkIn: "desc" }
    })
    res.json(visits)
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch visits" })
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