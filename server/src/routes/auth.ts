import { Router } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import prisma from "../lib/prisma"

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

// Register a new tenant + admin account
router.post("/register-tenant", async (req, res) => {
  const { tenantName, name, email, phone, password } = req.body

  try {
    // check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: "Email already registered" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // create tenant and admin user together
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        users: {
          create: {
            name,
            email,
            phone,
            password: hashedPassword,
            role: "ADMIN"
          }
        }
      },
      include: { users: true }
    })

    const admin = tenant.users[0]
    const token = jwt.sign(
      { userId: admin.id, tenantId: tenant.id, role: admin.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, user: admin, tenant })
  } catch (e) {
    res.status(500).json({ error: "Failed to register tenant" })
  }
})

// Register a new host under an existing tenant (admin only)
router.post("/register-host", async (req, res) => {
  const { name, email, phone, password, tenantId } = req.body

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: "Email already registered" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const host = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "HOST",
        tenantId
      }
    })

    res.json(host)
  } catch (e) {
    res.status(500).json({ error: "Failed to register host" })
  }
})

// Login for both hosts and admins
router.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    })

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, user, tenant: user.tenant })
  } catch (e) {
    res.status(500).json({ error: "Login failed" })
  }
})

export default router