"use client";
import { useEffect, useState } from "react";
import socket from "@/lib/socket";
import PhotoCapture from "@/components/PhotoCapture";

const getAPI = () => `https://${window.location.hostname}:4000/api`;

type KioskStep =
  | "phone-lookup"
  | "returning"
  | "new-form"
  | "photo"
  | "waiting"
  | "approved"
  | "denied";

interface Tenant {
  id: string;
  name: string;
}
interface Host {
  id: string;
  name: string;
}

export default function KioskPage() {
  const [step, setStep] = useState<KioskStep>("phone-lookup");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [matchedVisitor, setMatchedVisitor] = useState<any>(null);
  const [hostVisitCounts, setHostVisitCounts] = useState<
    Record<string, number>
  >({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    tenantId: "",
    hostId: "",
    purpose: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // fetch tenants on load
  useEffect(() => {
    fetch(`${getAPI()}/users/tenants`)
      .then((r) => r.json())
      .then(setTenants);
  }, []);

  // fetch hosts when tenant changes
  useEffect(() => {
    if (!form.tenantId) {
      setHosts([]);
      return;
    }
    fetch(`${getAPI()}/users?tenantId=${form.tenantId}`)
      .then((r) => r.json())
      .then(setHosts);
  }, [form.tenantId]);

  // listen for approval/denial from host
  useEffect(() => {
    socket.on("visit-status-updated", (visit) => {
      if (visit.status === "APPROVED") setStep("approved");
      if (visit.status === "DENIED") setStep("denied");
    });
    return () => {
      socket.off("visit-status-updated");
    };
  }, []);

  const fetchFrequentHosts = async (visitorId: string) => {
    const res = await fetch(`${getAPI()}/visitors/${visitorId}/frequent-hosts`);
    const data = await res.json();
    setHostVisitCounts(data);
  };

  // phone lookup — check if visitor exists
  const handlePhoneLookup = async () => {
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) {
      setErrors({ phone: "Enter a valid 10 digit number" });
      return;
    }

    setErrors({});
    setLoading(true);

    const res = await fetch(
      `${getAPI()}/visitors/by-phone?phone=${form.phone}`
    );

    if (res.ok) {
      const data = await res.json();
      setMatchedVisitor(data);
      await fetchFrequentHosts(data.id);
      setStep("returning");
    } else {
      // new visitor — phone already filled
      setStep("new-form");
    }

    setLoading(false);
  };

  // returning visitor submits with just tenant, host, purpose
  const handleReturningSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.tenantId) newErrors.tenantId = "Select a company";
    if (!form.hostId) newErrors.hostId = "Select a host";
    if (!form.purpose.trim()) newErrors.purpose = "Purpose is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await submitVisit(
      matchedVisitor.id,
      matchedVisitor.tenantId || form.tenantId
    );
  };

  // new visitor submits full form
  const goToPhoto = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.email.trim()) newErrors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Invalid email";
    if (!form.tenantId) newErrors.tenantId = "Required";
    if (!form.hostId) newErrors.hostId = "Required";
    if (!form.purpose.trim()) newErrors.purpose = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStep("photo");
  };
  const handleNewVisitorSubmit = async (base64?: string) => {
    setLoading(true);

    const visitorRes = await fetch(`${getAPI()}/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        tenantId: form.tenantId,
        image: base64 || null,
      }),
    });
    const visitor = await visitorRes.json();

    await submitVisit(visitor.id, form.tenantId);
    setLoading(false);
  };

  const submitVisit = async (visitorId: string, tenantId: string) => {
    const visitRes = await fetch(`${getAPI()}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        hostId: form.hostId,
        purpose: form.purpose,
        tenantId,
      }),
    });
    const visit = await visitRes.json();
    socket.emit("join-visit", visit.id);
    setStep("waiting");
  };

  const reset = () => {
    setStep("phone-lookup");
    setMatchedVisitor(null);
    setHostVisitCounts({});
    setForm({
      name: "",
      email: "",
      phone: "",
      tenantId: "",
      hostId: "",
      purpose: "",
    });
    setErrors({});
    setLoading(false);
  };

  // sorted hosts dropdown — most visited on top
  const sortedHosts = [...hosts].sort(
    (a, b) => (hostVisitCounts[b.id] || 0) - (hostVisitCounts[a.id] || 0)
  );

  // ─── PHONE LOOKUP ───────────────────────────────────────────
  if (step === "phone-lookup")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">Welcome</h1>
          <p className="text-gray-500 text-sm mb-6">
            Enter your phone number to continue
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <input
                className={`border p-3 rounded-lg w-full ${errors.phone ? "border-red-400" : ""
                  }`}
                placeholder="10 digit phone number"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <button
              onClick={handlePhoneLookup}
              disabled={loading}
              className="bg-black text-white p-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? "Looking up..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );

  if (step === "photo")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">One Last Step</h1>
          <p className="text-gray-500 text-sm">
            Take a quick photo for your visitor pass
          </p>
        </div>

        <PhotoCapture
          onCapture={(base64: string) => handleNewVisitorSubmit(base64)}
          onSkip={() => handleNewVisitorSubmit()}
        />
      </div>
    );
  // ─── RETURNING VISITOR ──────────────────────────────────────
  if (step === "returning")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {matchedVisitor?.name}! 👋
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Who are you here to meet today?
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <select
                className={`border p-3 rounded-lg w-full ${errors.tenantId ? "border-red-400" : ""
                  }`}
                value={form.tenantId}
                onChange={(e) =>
                  setForm({ ...form, tenantId: e.target.value, hostId: "" })
                }
              >
                <option value="">Select Company</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.tenantId && (
                <p className="text-red-500 text-xs mt-1">{errors.tenantId}</p>
              )}
            </div>

            <div>
              <select
                className={`border p-3 rounded-lg w-full ${errors.hostId ? "border-red-400" : ""
                  }`}
                value={form.hostId}
                disabled={!form.tenantId}
                onChange={(e) => setForm({ ...form, hostId: e.target.value })}
              >
                <option value="">Who are you visiting?</option>
                {sortedHosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {hostVisitCounts[h.id]
                      ? ` (${hostVisitCounts[h.id]} visit${hostVisitCounts[h.id] > 1 ? "s" : ""
                      })`
                      : ""}
                  </option>
                ))}
              </select>
              {errors.hostId && (
                <p className="text-red-500 text-xs mt-1">{errors.hostId}</p>
              )}
            </div>

            <div>
              <input
                className={`border p-3 rounded-lg w-full ${errors.purpose ? "border-red-400" : ""
                  }`}
                placeholder="Purpose of visit"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
              {errors.purpose && (
                <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>
              )}
            </div>

            <button
              onClick={handleReturningSubmit}
              disabled={loading}
              className="bg-black text-white p-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? "Checking in..." : "Check In"}
            </button>

            <button
              onClick={reset}
              className="text-sm text-gray-400 underline text-center"
            >
              Not you?
            </button>
          </div>
        </div>
      </div>
    );

  // ─── NEW VISITOR FORM ───────────────────────────────────────
  if (step === "new-form")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-8">
        <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2">New Visitor</h1>
          <p className="text-gray-500 text-sm mb-6">
            Fill in your details to check in
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <input
                className={`border p-3 rounded-lg w-full ${errors.name ? "border-red-400" : ""
                  }`}
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <input
                className={`border p-3 rounded-lg w-full ${errors.email ? "border-red-400" : ""
                  }`}
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* phone pre-filled and readonly from lookup step */}
            <div>
              <input
                className="border p-3 rounded-lg w-full bg-gray-50 text-gray-500"
                value={form.phone}
                readOnly
              />
            </div>

            <div>
              <select
                className={`border p-3 rounded-lg w-full ${errors.tenantId ? "border-red-400" : ""
                  }`}
                value={form.tenantId}
                onChange={(e) =>
                  setForm({ ...form, tenantId: e.target.value, hostId: "" })
                }
              >
                <option value="">Select Company</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.tenantId && (
                <p className="text-red-500 text-xs mt-1">{errors.tenantId}</p>
              )}
            </div>

            <div>
              <select
                className={`border p-3 rounded-lg w-full ${errors.hostId ? "border-red-400" : ""
                  }`}
                value={form.hostId}
                disabled={!form.tenantId}
                onChange={(e) => setForm({ ...form, hostId: e.target.value })}
              >
                <option value="">Who are you visiting?</option>
                {sortedHosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {errors.hostId && (
                <p className="text-red-500 text-xs mt-1">{errors.hostId}</p>
              )}
            </div>

            <div>
              <input
                className={`border p-3 rounded-lg w-full ${errors.purpose ? "border-red-400" : ""
                  }`}
                placeholder="Purpose of visit"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
              {errors.purpose && (
                <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>
              )}
            </div>

            <button
              onClick={goToPhoto}
              disabled={loading}
              className="bg-black text-white p-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? "Checking in..." : "Register & Check In"}
            </button>

            <button
              onClick={reset}
              className="text-sm text-gray-400 underline text-center"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );

  // ─── WAITING ────────────────────────────────────────────────
  if (step === "waiting")
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold">Waiting for approval</h1>
          <p className="text-gray-500 mt-2">Your host has been notified</p>
        </div>
      </div>
    );

  // ─── APPROVED ───────────────────────────────────────────────
  if (step === "approved")
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600">
            You&quot;re all set!
          </h1>
          <p className="text-gray-500 mt-2">
            Head on in — your host is expecting you
          </p>
          <button
            onClick={reset}
            className="mt-6 text-sm text-gray-400 underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );

  // ─── DENIED ─────────────────────────────────────────────────
  if (step === "denied")
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-500 mt-2">
            Your host is unavailable right now
          </p>
          <button
            onClick={reset}
            className="mt-6 text-sm text-gray-400 underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );

  return null;
}
