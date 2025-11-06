import React, { useEffect, useState } from "react";

const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 16 };
const thStyle = { background: "#e3f2fd", padding: "8px 12px", fontWeight: 600, border: "1px solid #eee" };
const tdStyle = { padding: "8px 12px", border: "1px solid #eee" };
const badgeStyle = (color: string) => ({ background: color, color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 12 });
const statusColor = (status?: string) => {
  if (status === "verified") return "#2e7d32";
  if (status === "revoked") return "#c62828";
  return "#1976d2";
};

const MediaAdmin = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = () => {
    setLoading(true);
    fetch("/api/registrations")
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch media");
        return r.json();
      })
      .then(setMedia)
      .catch((e: any) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  };

  const revokeMedia = async (sha256_hash: string) => {
    setRevoking(sha256_hash);
    try {
      const resp = await fetch(`/api/registrations/${sha256_hash}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" })
      });
      if (!resp.ok) throw new Error("Revoke failed");
      await fetchMedia();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 26, marginBottom: 20, color: "#1976d2" }}>Registered Media</h2>
      {error && <div style={{ color: "#c62828", marginBottom: 12 }}>Error: {error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <table style={tableStyle as any}>
          <thead>
            <tr>
              <th style={thStyle}>Image</th>
              <th style={thStyle}>File Name</th>
              <th style={thStyle}>AI Model</th>
              <th style={thStyle}>Prompt/Notes</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Signer</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {media.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, color: "#888", textAlign: "center" }}>No media found.</td></tr>
            )}
            {media.map((m: any) => (
              <tr key={m.sha256_hash}>
                <td style={{ ...tdStyle, width: 80, textAlign: "center" }}>
                  {m.file_url ? (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                      <img src={m.file_url} alt={m.file_name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                    </a>
                  ) : (
                    <span style={{ color: "#aaa", fontSize: 12 }}>No image</span>
                  )}
                </td>
                <td style={tdStyle}>{m.file_name}</td>
                <td style={tdStyle}>{m.ai_model}</td>
                <td style={tdStyle}>{m.notes}</td>
                <td style={tdStyle}><span style={badgeStyle(statusColor(m.status))}>{m.status}</span></td>
                <td style={tdStyle}>{m.signer_address?.slice(0, 8) + "..."}</td>
                <td style={tdStyle}>
                  {m.status !== "revoked" ? (
                    <button
                      onClick={() => revokeMedia(m.sha256_hash)}
                      disabled={revoking === m.sha256_hash}
                      style={{
                        background: "#c62828",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "6px 16px",
                        fontWeight: 600,
                        cursor: revoking === m.sha256_hash ? "not-allowed" : "pointer"
                      }}
                    >
                      {revoking === m.sha256_hash ? "Revoking…" : "Revoke"}
                    </button>
                  ) : (
                    <>
                      <span style={badgeStyle("#c62828")}>Revoked</span>
                      <button
                        onClick={async () => {
                          setRevoking(m.sha256_hash);
                          try {
                            const resp = await fetch(`/api/registrations/${m.sha256_hash}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "verified" })
                            });
                            if (!resp.ok) throw new Error("Restore failed");
                            await fetchMedia();
                          } catch (e: any) {
                            setError(e.message || String(e));
                          } finally {
                            setRevoking(null);
                          }
                        }}
                        disabled={revoking === m.sha256_hash}
                        style={{
                          background: "#1976d2",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 16px",
                          fontWeight: 600,
                          marginLeft: 8,
                          cursor: revoking === m.sha256_hash ? "not-allowed" : "pointer"
                        }}
                      >
                        {revoking === m.sha256_hash ? "Restoring…" : "Restore"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MediaAdmin;
