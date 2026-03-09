import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", async(req, res) => {
    const { tenantId } = req.query;
    try{
        const hosts = await prisma.user.findMany({
            where: {tenantId: tenantId as string}
        })
        res.json(hosts)
    }catch(e){
        res.status(500).json({error: "failed to fetch hosts"})
    }
})

router.get("/tenants", async(req, res) => {
    try{
        const tenants = await prisma.tenant.findMany({})
        res.json(tenants)
    }catch(e){
        res.status(500).json({error: "failed to fetch tenants"})
    }
})

export default router;