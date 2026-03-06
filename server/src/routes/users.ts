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

export default router;