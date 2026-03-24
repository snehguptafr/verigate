"use client";
import { useState } from "react";

const getAPI = () => `https://${window.location.hostname}:4000/api`;

export default function ExitPage() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [visitorName, setVisitorName] = useState("");

  const handleCheckout = async () => {
    if (!phone.trim()) {
      setError("Please enter your phone");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      // find active visit by phone
      const res = await fetch(`${getAPI()}/visits/active?phone=${phone}`);
      const data = await res.json();

      if (!res.ok || !data) {
        setError("No active visit found for this phone");
        setStatus("idle");
        return;
      }

      // checkout
      await fetch(`${getAPI()}/visits/${data.id}/checkout`, {
        method: "PATCH",
      });

      setVisitorName(data.visitor.name);
      setStatus("done");
    } catch {
      setError("Something went wrong");
      setStatus("idle");
    }
  };

  if (status === "done")
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-bold">Thank you, {visitorName}!</h1>
          <p className="text-gray-500 mt-2">
            You have been checked out successfully.
          </p>
          <p className="text-gray-400 text-sm mt-1">Have a great day!</p>
          <button
            onClick={() => {
              setPhone("");
              setStatus("idle");
            }}
            className="mt-6 text-sm text-gray-400 underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Check Out</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your phone to sign out
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            className="border p-3 rounded-lg w-full"
            placeholder="Your phone"
            type="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            onClick={handleCheckout}
            disabled={status === "loading"}
            className="bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {status === "loading" ? "Checking out..." : "Check Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
