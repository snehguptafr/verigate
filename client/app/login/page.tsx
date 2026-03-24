"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";

const API = `https://${
  typeof window !== "undefined" ? window.location.hostname : "localhost"
}:4000/api`;

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async() => {
    setLoading(true)
    setError("")
    try{
        const res = await fetch(`${API}/auth/login`,{
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify(form)
        })
        const data = await res.json()
        console.log(data)
        if(!res.ok){
            setError(data.error || "login failed")
            setLoading(false)
            return
        }

        setToken(data.token)
        router.push("/dashboard")
    }catch{
        setError("Something went wrong")
        setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Verigate</h1>
        <p className="text-gray-500 mb-6 text-sm">Sign in to your dashboard</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            className="border p-3 rounded-lg"
            placeholder="Email"
            type="email"
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="border p-3 rounded-lg"
            placeholder="Password"
            type="password"
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  )
}
