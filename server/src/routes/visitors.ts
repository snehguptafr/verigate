import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.post("/", async(req, res) => {
    const { name, email, phone, tenantId } = req.body;
    try{
        const visitor = await prisma.visitor.create({
            data: { name, email, phone, tenantId }
        })
        res.json(visitor)
    }catch(e){
        res.status(500).json({error: "Failed to create user", details: e})
    }
})

router.get("/", async(req, res) => {
    const { tenantId } = req.query;
    try{
        const visitors = await prisma.visitor.findMany({
            where: { tenantId: tenantId as string }
        })
        res.json(visitors)
    }catch(e){
        res.status(500).json({error: "failed to fetch visitors", details: e})
    }
})

export default router;