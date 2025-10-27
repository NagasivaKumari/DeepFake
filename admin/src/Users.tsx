import React, { useEffect, useState } from "react";

const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 16 };
const thStyle = { background: "#e3f2fd", padding: "8px 12px", fontWeight: 600, border: "1px solid #eee" };
const tdStyle = { padding: "8px 12px", border: "1px solid #eee" };
const badgeStyle = (color: string) => ({ background: color, color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 12 });
const statusColor = (status?: string) => {
  if (status === "approved" || status === "verified") return "#2e7d32";
  if (status === "email_pending") return "#fbc02d";
  if (status === "email_verified") return "#1976d2";
  if (status === "rejected") return "#c62828";
  return "#1976d2";
};

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/kyc")
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch users");
        return r.json();
      })
      .then(setUsers)
      .catch((e: any) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  };

  const approveUser = async (id: string) => {
    setApproving(id);
    try {
      const resp = await fetch(`/api/admin/kyc/${id}/approve`, { method: "POST" });
      if (!resp.ok) throw new Error("Approve failed");
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setApproving(null);
    }
  };

  const rejectUser = async (id: string) => {
    setRejecting(id);
    try {
      const resp = await fetch(`/api/admin/kyc/${id}/reject`, { method: "POST" });
      if (!resp.ok) throw new Error("Reject failed");
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setRejecting(null);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 26, marginBottom: 20, color: "#1976d2" }}>Users</h2>
      {error && <div style={{ color: "#c62828", marginBottom: 12 }}>Error: {error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <table style={tableStyle as any}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>DOB</th>
              <th style={thStyle}>KYC Status</th>
              <th style={thStyle}>Email Verified</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdStyle, color: "#888", textAlign: "center" }}>No users found.</td></tr>
            )}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td style={tdStyle}>{u.full_name}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.phone || "-"}</td>
                <td style={tdStyle}>{u.country || "-"}</td>
                <td style={tdStyle}>{u.dob || "-"}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(statusColor(u.status))}>{u.status || "-"}</span>
                </td>
                <td style={tdStyle}>
                  {u.status === "email_verified" || u.status === "verified" || u.status === "approved" ? (
                    <span style={badgeStyle("#2e7d32")}>Yes</span>
                  ) : (
                    <span style={badgeStyle("#c62828")}>No</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setSelected(u)} style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginRight: 8
                  }}>View</button>
                  {(u.status === "email_pending" || u.status === "email_verified") && (
                    <>
                      <button
                        onClick={() => approveUser(u.id)}
                        disabled={approving === u.id}
                        style={{
                          background: approving === u.id ? "#bbb" : "#2e7d32",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 16px",
                          fontWeight: 600,
                          cursor: approving === u.id ? "not-allowed" : "pointer",
                          marginRight: 8
                        }}
                      >{approving === u.id ? "Approving..." : "Approve"}</button>
                      <button
                        onClick={() => rejectUser(u.id)}
                        disabled={rejecting === u.id}
                        style={{
                          background: rejecting === u.id ? "#bbb" : "#c62828",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 16px",
                          fontWeight: 600,
                          cursor: rejecting === u.id ? "not-allowed" : "pointer"
                        }}
                      >{rejecting === u.id ? "Rejecting..." : "Reject"}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for user details */}
      {selected && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#0008", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setSelected(null)}>
          <div style={{ background: "#fff", borderRadius: 10, minWidth: 340, maxWidth: 420, padding: 32, boxShadow: "0 4px 24px #0003", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" }}>&times;</button>
            <h3 style={{ fontSize: 22, marginBottom: 12, color: "#1976d2" }}>User Details</h3>
            <div style={{ marginBottom: 8 }}><b>Name:</b> {selected.full_name}</div>
            <div style={{ marginBottom: 8 }}><b>Email:</b> {selected.email}</div>
            <div style={{ marginBottom: 8 }}><b>Phone:</b> {selected.phone || "-"}</div>
            <div style={{ marginBottom: 8 }}><b>Country:</b> {selected.country || "-"}</div>
            <div style={{ marginBottom: 8 }}><b>Date of Birth:</b> {selected.dob || "-"}</div>
            <div style={{ marginBottom: 8 }}><b>KYC Status:</b> <span style={badgeStyle(statusColor(selected.status))}>{selected.status || "-"}</span></div>
            <div style={{ marginBottom: 8 }}><b>Email Verified:</b> {selected.status === "email_verified" || selected.status === "verified" || selected.status === "approved" ? "Yes" : "No"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
