export const storage: any = {
  integrations: {
    Core: {
      async UploadFile({ file }: { file: any }) {
        // Post file to backend /media/upload endpoint which pins to IPFS and returns metadata/info.
        try {
          const form = new FormData();
          form.append('file', file, file.name);
          const resp = await fetch('/media/upload', { method: 'POST', body: form });
          if (!resp.ok) {
            // Fallback to local object URL for dev
            return { file_url: URL.createObjectURL(file) };
          }
          const data = await resp.json();
          // The backend returns file_url and ipfs_cid
          return { file_url: data.file_url, ipfs_cid: data.ipfs_cid };
        } catch (e) {
          return { file_url: URL.createObjectURL(file) };
        }
      },
    },
  },
  entities: {
    RegisteredMedia: {
  async list(_sort?: string, _limit?: number) {
        try {
    // Request only registrations whose CIDs resolve at the configured gateway
    const resp = await fetch('/api/registrations?availability=filter');
            if (!resp.ok) return [];
            const regs = await resp.json();

            // If backend already includes email/phone and verified flags, return as-is.
            if (!Array.isArray(regs)) return regs;

            // Helper: fetch KYC status for an address with a short timeout
            const fetchKyc = async (address: string) => {
              if (!address) return null;
              try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 3000);
                const r = await fetch(`/api/kyc/status?address=${encodeURIComponent(address)}`, { signal: controller.signal });
                clearTimeout(id);
                if (!r.ok) return null;
                return await r.json();
              } catch (e) {
                return null;
              }
            };

            // Enrich registrations with KYC data when missing
            const enriched = await Promise.all(regs.map(async (reg: any) => {
              try {
                // If reg already has explicit verification info, skip fetching
                if (reg.email_verified !== undefined || reg.phone_verified !== undefined || reg.email || reg.phone) {
                  return reg;
                }
                const kyc = await fetchKyc(reg.signer_address || reg.wallet_address || reg.address);
                if (!kyc) return reg;
                // Merge known fields conservatively
                return {
                  ...reg,
                  email: reg.email || kyc.email || null,
                  phone: reg.phone || kyc.phone || null,
                  email_verified: reg.email_verified !== undefined ? reg.email_verified : (kyc.email_verified ?? (kyc.status === 'approved')),
                  phone_verified: reg.phone_verified !== undefined ? reg.phone_verified : (kyc.phone_verified ?? false),
                };
              } catch (e) {
                return reg;
              }
            }));

            return enriched;
        } catch (e) {
          return [];
        }
      },
      async create(data: any) {
        try {
          // If caller passed a FormData (multipart upload), let the browser set
          // the Content-Type (including the boundary). For plain objects, send JSON.
          const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
          const options: any = {
            method: 'POST',
            body: isForm ? data : JSON.stringify(data),
          };
          if (!isForm) {
            options.headers = { 'Content-Type': 'application/json' };
          }

          const resp = await fetch('/media/register', options);
          if (!resp.ok) {
            const errorText = await resp.text();
            console.error("Register API error:", errorText);
            throw new Error(errorText);
          }
          return await resp.json();
        } catch (e) {
          return { error: String(e) };
        }
      },
      async update(id: string, patch: any) {
        if (!id || id === 'undefined') {
          return { error: 'Invalid registration id' };
        }
        try {
          const resp = await fetch(`/api/registrations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          return await resp.json();
        } catch (e) {
          return { error: String(e) };
        }
      },
    },
  },
};

export default storage;
