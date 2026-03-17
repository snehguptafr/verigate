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
    const existing = await prisma.visit.findUnique({ where: { id } })

    if (!existing) {
      return res.status(404).json({ error: "Visit not found" })
    }

    if (existing.status !== "PENDING") {
      return res.status(409).json({ error: "Visit already actioned" })
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: { status },
      include: { visitor: true, host: true }
    })

    // notify the kiosk that status changed
    io.to(`visit-${id}`).emit("visit-status-updated", visit)
    //notify dashboard
    io.to(visit.hostId).emit("visit-actioned", visit)


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

router.patch("/:id/checkout", async (req, res) => {
  try {
    const visit = await prisma.visit.update({
      where: { id: req.params.id },
      data: { 
        status: "COMPLETED",
        checkOut: new Date()
      },
      include: { visitor: true, host: true }
    })

    // notify host that visitor has left
    io.to(visit.hostId).emit("visitor-left", visit)

    res.json(visit)
  } catch (e) {
    res.status(500).json({ error: "Failed to checkout" })
  }
})

router.get("/active", async (req, res) => {
  const { phone } = req.query

  try {
    const visit = await prisma.visit.findFirst({
      where: {
        status: "APPROVED",
        visitor: { phone: phone as string }
      },
      include: { visitor: true, host: true },
      orderBy: { checkIn: "desc" }
    })

    if (!visit) {
      return res.status(404).json({ error: "No active visit found" })
    }

    res.json(visit)
  } catch (e) {
    res.status(500).json({ error: "Failed to find active visit" })
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