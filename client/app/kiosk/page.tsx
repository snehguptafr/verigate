"use client"
import { useEffect, useState } from "react"
import socket from "@/lib/socket"

const getAPI = () => `http://${window.location.hostname}:4000/api`

interface Tenant { id: string; name: string }
interface Host { id: string; name: string }

interface FormState {
  name: string
  email: string
  phone: string
  tenantId: string
  hostId: string
  purpose: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  tenantId?: string
  hostId?: string
  purpose?: string
}

export default function KioskPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  const [form, setForm] = useState<FormState>({
    name: "", email: "", phone: "", tenantId: "", hostId: "", purpose: ""
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<"idle" | "loading" | "waiting" | "approved" | "denied">("idle")

  // fetch tenants on load
  useEffect(() => {
    fetch(`${getAPI()}/users/tenants`)
      .then(r => r.json())
      .then(setTenants)
  }, [])

  // fetch hosts when tenant is selected
  useEffect(() => {
    if (!form.tenantId) {
      setHosts([])
      return
    }
    fetch(`${getAPI()}/users?tenantId=${form.tenantId}`)
      .then(r => r.json())
      .then(setHosts)
  }, [form.tenantId])

  // listen for approval/denial
  useEffect(() => {
    socket.on("visit-status-updated", (visit) => {
      if (visit.status === "APPROVED") setStatus("approved")
      if (visit.status === "DENIED") setStatus("denied")
    })
    return () => { socket.off("visit-status-updated") }
  }, [])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.name.trim())
      newErrors.name = "Name is required"

    if (!form.email.trim())
      newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Enter a valid email"

    if (!form.phone.trim())
      newErrors.phone = "Phone is required"
    else if (!/^\d{10}$/.test(form.phone))
      newErrors.phone = "Enter a valid 10 digit number"

    if (!form.tenantId)
      newErrors.tenantId = "Please select a company"

    if (!form.hostId)
      newErrors.hostId = "Please select a host"

    if (!form.purpose.trim())
      newErrors.purpose = "Purpose is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setStatus("loading")
    try {
      const visitorRes = await fetch(`${getAPI()}/visitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          tenantId: form.tenantId
        })
      })
      const visitor = await visitorRes.json()

      const visitRes = await fetch(`${getAPI()}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: visitor.id,
          hostId: form.hostId,
          purpose: form.purpose,
          tenantId: form.tenantId
        })
      })
      const visit = await visitRes.json()

      socket.emit("join-visit", visit.id)
      setStatus("waiting")
    } catch {
      setStatus("idle")
    }
  }

  const reset = () => {
    setForm({ name: "", email: "", phone: "", tenantId: "", hostId: "", purpose: "" })
    setErrors({})
    setStatus("idle")
  }

  if (status === "waiting") return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold">Waiting for approval</h1>
        <p className="text-gray-500 mt-2">Your host has been notified</p>
      </div>
    </div>
  )

  if (status === "approved") return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-600">You&apos;re all set!</h1>
        <p className="text-gray-500 mt-2">Head on in — your host is expecting you</p>
        <button onClick={reset} className="mt-6 text-sm text-gray-400 underline">
          Back to home
        </button>
      </div>
    </div>
  )

  if (status === "denied") return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 mt-2">Your host is unavailable right now</p>
        <button onClick={reset} className="mt-6 text-sm text-gray-400 underline">
          Back to home
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-8">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Welcome — Sign In</h1>
        <div className="flex flex-col gap-4">

          <div>
            <input
              className={`border p-3 rounded-lg w-full ${errors.name ? "border-red-400" : ""}`}
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <input
              className={`border p-3 rounded-lg w-full ${errors.email ? "border-red-400" : ""}`}
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <input
              className={`border p-3 rounded-lg w-full ${errors.phone ? "border-red-400" : ""}`}
              placeholder="Phone (10 digits)"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <select
              className={`border p-3 rounded-lg w-full ${errors.tenantId ? "border-red-400" : ""}`}
              value={form.tenantId}
              onChange={e => setForm({ ...form, tenantId: e.target.value, hostId: "" })}
            >
              <option value="">Select Company</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.tenantId && <p className="text-red-500 text-xs mt-1">{errors.tenantId}</p>}
          </div>

          <div>
            <select
              className={`border p-3 rounded-lg w-full ${errors.hostId ? "border-red-400" : ""}`}
              value={form.hostId}
              disabled={!form.tenantId}
              onChange={e => setForm({ ...form, hostId: e.target.value })}
            >
              <option value="">Who are you visiting?</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {errors.hostId && <p className="text-red-500 text-xs mt-1">{errors.hostId}</p>}
          </div>

          <div>
            <input
              className={`border p-3 rounded-lg w-full ${errors.purpose ? "border-red-400" : ""}`}
              placeholder="Purpose of visit"
              value={form.purpose}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
            />
            {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Check In"}
          </button>
        </div>
      </div>
    </div>
  )
}