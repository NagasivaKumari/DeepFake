
import React, { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";

export type KycStatus = "not_started" | "email_pending" | "email_verified" | "otp_sent" | "verified" | "approved" | "rejected";



interface KycRegistrationProps {
  onStatusChange?: (status: KycStatus, kycId: string) => void;
}



interface KycRegistrationProps {
  onStatusChange?: (status: KycStatus, kycId: string) => void;
}

export default function KycRegistration({ onStatusChange }: KycRegistrationProps) {
  const { address, connect, isConnected } = useWallet();
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "email_sent" | "email" | "done">("form");
  const [form, setForm] = useState<{ full_name: string; email: string; phone: string; country: string; dob: string; wallet_address?: string }>({ full_name: "", email: "", phone: "", country: "", dob: "" });
  const [kycId, setKycId] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "dob" && e.target.value) {
      // Only allow 4-digit year
      const parts = e.target.value.split("-");
      if (parts.length === 3 && parts[0].length > 4) {
        // Ignore change if year is longer than 4 digits
        return;
      }
    }
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Block submission if wallet is not connected or address is missing
    if (!isConnected || !address) {
      setError("Please connect your wallet before submitting KYC.");
      return;
    }
    setLoading(true);
    try {
      // Check KYC status for this wallet first
      const statusResp = await fetch(`/api/kyc/status?address=${address}`);
      if (statusResp.ok) {
        const statusData = await statusResp.json();
        if (statusData.status === "approved") {
          // Already approved, redirect to dashboard
          if (navigate) navigate('/dashboard');
          return;
        }
      }
      // Always include wallet_address in payload
      const payload = { ...form, wallet_address: address };
      const resp = await fetch("/api/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        let msg = "Failed to register for KYC";
        try {
          const err = await resp.json();
          msg = err.detail || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await resp.json();
      setKycId(data.id);
      setStep("email_sent");
      onStatusChange && onStatusChange("email_pending", data.id);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/kyc/verify_email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kyc_id: kycId, code: emailCode })
      });
      if (!resp.ok) throw new Error("Invalid code or verification failed");
      setStep("done");
      onStatusChange && onStatusChange("email_verified", kycId);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px #0002", padding: 32 }}>
      {step === "form" && (
        <>
          {!isConnected ? (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, color: "#1976d2", marginBottom: 12 }}>Connect Wallet</h2>
              <button
                onClick={connect}
                style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 4, padding: "12px 24px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}
              >
                Connect Wallet
              </button>
              <div style={{ color: "#888", fontSize: 14, marginTop: 10 }}>You must connect your wallet before registering for KYC.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12, color: "#1976d2", fontWeight: 500, fontSize: 15 }}>
                Wallet Address: <span style={{ fontFamily: "monospace", color: "#333" }}>{address}</span>
              </div>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2 style={{ fontSize: 22, marginBottom: 8, color: "#1976d2" }}>Register for KYC</h2>
                <input name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} required style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
                <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
                <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
                <input name="country" placeholder="Country" value={form.country} onChange={handleChange} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
                <input name="dob" type="date" placeholder="Date of Birth" value={form.dob} onChange={handleChange} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
                {error && <div style={{ color: "#c62828" }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 4, padding: "12px 0", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>{loading ? "Registering..." : "Register for KYC"}</button>
              </form>
            </>
          )}
        </>
      )}
      {step === "email_sent" && (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 22, color: "#1976d2" }}>Verification Email Sent</h2>
          <p>Please check your inbox and enter the code below to verify your email.</p>
          <button
            style={{ marginTop: 16, background: "#1976d2", color: "#fff", border: "none", borderRadius: 4, padding: "12px 24px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}
            onClick={() => setStep("email")}
          >
            Enter Verification Code
          </button>
        </div>
      )}
      {step === "email" && (
        <form onSubmit={handleVerifyEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8, color: "#1976d2" }}>Verify Your Email</h2>
          <input name="emailCode" placeholder="Enter Email Code" value={emailCode} onChange={e => setEmailCode(e.target.value)} required style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
          {error && <div style={{ color: "#c62828" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 4, padding: "12px 0", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>{loading ? "Verifying..." : "Verify Email"}</button>
        </form>
      )}
      {step === "done" && (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 22, color: "#1976d2" }}>Email Verified!</h2>
          <p>Your KYC registration is pending admin approval. You will be notified once approved.</p>
        </div>
      )}
    </div>
  );
}
