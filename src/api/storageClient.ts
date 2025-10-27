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
          const resp = await fetch('/api/registrations');
          if (!resp.ok) return [];
          return await resp.json();
        } catch (e) {
          return [];
        }
      },
      async create(data: any) {
        try {
          const resp = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          return await resp.json();
        } catch (e) {
          return { error: String(e) };
        }
      },
      async update(id: string, patch: any) {
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
