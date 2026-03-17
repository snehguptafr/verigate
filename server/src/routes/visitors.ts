import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.post("/", async (req, res) => {
    const { name, email, phone, tenantId } = req.body;
    try {
        const existing = await prisma.visitor.findFirst({
            where: { phone }
        })

        if (existing) return res.json(existing)
        const visitor = await prisma.visitor.create({
            data: { name, email, phone, tenantId }
        })
        res.json(visitor)
    } catch (e) {
        res.status(500).json({ error: "Failed to create user", details: e })
    }
})

router.get("/", async (req, res) => {
    const { tenantId } = req.query;
    try {
        const visitors = await prisma.visitor.findMany({
            where: { tenantId: tenantId as string }
        })
        res.json(visitors)
    } catch (e) {
        res.status(500).json({ error: "failed to fetch visitors", details: e })
    }
})

router.get("/:id/frequent-hosts", async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { visitorId: req.params.id },
      select: { hostId: true }
    })

    const countMap: Record<string, number> = {}
    for (const visit of visits) {
      countMap[visit.hostId] = (countMap[visit.hostId] || 0) + 1
    }

    res.json(countMap)
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch frequent hosts" })
  }
})

router.get("/by-phone", async (req, res) => {
  const { phone } = req.query
  try {
    const visitor = await prisma.visitor.findFirst({
      where: { phone: phone as string }
    })
    if (!visitor) return res.status(404).json({ error: "Not found" })
    res.json(visitor)
  } catch {
    res.status(500).json({ error: "Failed to find visitor" })
  }
})

export default router;