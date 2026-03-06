"use client"
import { useEffect, useState } from "react"
import axios from "axios"

const API = "http://192.168.175.133:4000/api"
const TENANT_ID = "tenant_1"

export default function KioskPage() {
  const [hosts, setHosts] = useState([])
  const [form, setForm] = useState({
    name: "", email: "", phone: "", hostId: "", purpose: ""
  })
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle")

  useEffect(() => {
    axios.get(`${API}/users?tenantId=${TENANT_ID}`)
      .then(r => setHosts(r.data))
  }, [])

  const handleSubmit = async () => {
    setStatus("loading")
    try {
      const visitor = await axios.post(`${API}/visitors`, {
        ...form, tenantId: TENANT_ID
      })
      await axios.post(`${API}/visits`, {
        visitorId: visitor.data.id,
        hostId: form.hostId,
        purpose: form.purpose,
        tenantId: TENANT_ID
      })
      setStatus("success")
    } catch {
      setStatus("error")
    }
  }

  if (status === "success") return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold text-green-600">You&apos;re all set!</h1>
      <p className="text-gray-500 mt-2">Your host has been notified.</p>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Welcome — Sign In</h1>
        <div className="flex flex-col gap-4">
          <input className="border p-3 rounded-lg" placeholder="Full Name"
            onChange={e => setForm({...form, name: e.target.value})} />
          <input className="border p-3 rounded-lg" placeholder="Email"
            onChange={e => setForm({...form, email: e.target.value})} />
          <input className="border p-3 rounded-lg" placeholder="Phone"
            onChange={e => setForm({...form, phone: e.target.value})} />
          <select className="border p-3 rounded-lg"
            onChange={e => setForm({...form, hostId: e.target.value})}>
            <option value="">Who are you visiting?</option>
            {hosts.map((h: any) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <input className="border p-3 rounded-lg" placeholder="Purpose of visit"
            onChange={e => setForm({...form, purpose: e.target.value})} />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800"
          >
            {status === "loading" ? "Submitting..." : "Check In"}
          </button>
        </div>
      </div>
    </div>
  )
}