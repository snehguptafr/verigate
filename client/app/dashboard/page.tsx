"use client"
import { useEffect, useState } from "react"
import socket from "@/lib/socket"

const HOST_ID = "host_1" // hardcoded for now, will come from auth later

export default function Dashboard() {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    // join the host's room
    socket.emit("join", HOST_ID)

    // listen for incoming visitors
    socket.on("visitor-arrived", (visit) => {
      setNotifications(prev => [visit, ...prev])
    })

    return () => { socket.off("visitor-arrived") }
  }, [])

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
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full mt-2 inline-block">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}