"use client"
import { useEffect, useState } from "react"
import socket from "@/lib/socket"

const HOST_ID = "host_1"
const API = `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:4000/api`

export default function Dashboard() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // fetch existing visits on load
  useEffect(() => {
    fetch(`${API}/visits/host/${HOST_ID}`)
      .then(r => r.json())
      .then(data => {
        setNotifications(data)
        setLoading(false)
      })
  }, [])

  // socket for new visits coming in live
  useEffect(() => {
    socket.emit("join", HOST_ID)

    socket.on("visitor-arrived", (visit) => {
      setNotifications(prev => {
        // avoid duplicates if visit already loaded from DB
        const exists = prev.find(n => n.id === visit.id)
        if (exists) return prev
        return [visit, ...prev]
      })
    })

    return () => { socket.off("visitor-arrived") }
  }, [])

  const updateStatus = async (visitId: string, status: "APPROVED" | "DENIED") => {
    await fetch(`${API}/visits/${visitId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    })

    setNotifications(prev =>
      prev.map(n => n.id === visitId ? { ...n, status } : n)
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Host Dashboard</h1>
      {notifications.length === 0 ? (
        <p className="text-gray-400">No visitors yet. Waiting...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.map((n, i) => (
            <div key={i} className="border rounded-xl p-4 shadow-sm bg-white">
              <p className="font-semibold text-lg">{n.visitor.name}</p>
              <p className="text-gray-500 text-sm">{n.visitor.email} · {n.visitor.phone}</p>
              <p className="text-gray-600 mt-1">Purpose: {n.purpose}</p>

              {n.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => updateStatus(n.id, "APPROVED")}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(n.id, "DENIED")}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600"
                  >
                    Deny
                  </button>
                </div>
              )}

              {n.status === "APPROVED" && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mt-2 inline-block">
                  Approved
                </span>
              )}

              {n.status === "DENIED" && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full mt-2 inline-block">
                  Denied
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}