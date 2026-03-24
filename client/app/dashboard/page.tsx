/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import socket from "@/lib/socket";
import { useAuth } from "@/lib/useAuth";
import { logout } from "@/lib/auth";

const API = `https://${
  typeof window !== "undefined" ? window.location.hostname : "localhost"
}:4000/api`;

export default function Dashboard() {
  const { user, checking } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // fetch existing visits on load
  useEffect(() => {
    if (!user) return;

    fetch(`${API}/visits/host/${user.userId}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      });
  }, [user]);

  // socket for new visits coming in live
  useEffect(() => {
    if (!user) return;
    socket.emit("join", user.userId);

    socket.on("visitor-arrived", (visit) => {
      setNotifications((prev) => {
        // avoid duplicates if visit already loaded from DB
        const exists = prev.find((n) => n.id === visit.id);
        if (exists) return prev;
        return [visit, ...prev];
      });
    });

    socket.on("visit-actioned", (visit) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === visit.id ? { ...n, status: visit.status } : n
        )
      );
    });

    socket.on("visitor-left", (visit) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === visit.id ? { ...n, status: "COMPLETED" } : n))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("visitor-arrived");
      socket.off("visitor-left"); // add this
    };
  }, [user]);

  const updateStatus = async (
    visitId: string,
    status: "APPROVED" | "DENIED"
  ) => {
    const res = await fetch(`${API}/visits/${visitId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.status === 409) {
      // already actioned by another window — just refresh state
      const data = await res.json();
      console.log(data.error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === visitId ? { ...n, status } : n))
    );
  };

  if (checking || loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Host Dashboard</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-black"
        >
          Logout
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-gray-400">No visitors yet. Waiting...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.map((n, i) => (
            <div key={i} className="border rounded-xl p-4 shadow-sm bg-white">
              {n.visitor.photoUrl ? (
                <img
                alt="user-img"
                  src={n.visitor.photoUrl}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl text-gray-400">👤</span>
                </div>
              )}
              <p className="font-semibold text-lg">{n.visitor.name}</p>
              <p className="text-gray-500 text-sm">
                {n.visitor.email} · {n.visitor.phone}
              </p>
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

              {n.status === "COMPLETED" && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mt-2 inline-block">
                  Checked Out
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
