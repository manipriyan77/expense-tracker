import { create } from "zustand";

export interface DocumentRecord {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  status: "queued" | "stored" | "review";
  source: "upload" | "import";
  linked_transaction_id: string | null;
  created_at: string;
}

interface DocumentsState {
  documents: DocumentRecord[];
  loading: boolean;
  uploading: boolean;
  fetchDocuments: () => Promise<void>;
  uploadDocuments: (files: File[]) => Promise<{ uploaded: number; failed: number }>;
  deleteDocument: (id: string) => Promise<void>;
  getViewUrl: (id: string) => Promise<string | null>;
}

export const useDocumentsStore = create<DocumentsState>((set) => ({
  documents: [],
  loading: false,
  uploading: false,

  fetchDocuments: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) return;
      const data: DocumentRecord[] = await res.json();
      set({ documents: data });
    } catch {
      // silently fail — user may be unauthenticated yet
    } finally {
      set({ loading: false });
    }
  },

  uploadDocuments: async (files) => {
    set({ uploading: true });
    let uploaded = 0;
    let failed = 0;
    try {
      for (const file of files) {
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/documents", { method: "POST", body: form });
          if (!res.ok) {
            failed += 1;
            continue;
          }
          const doc: DocumentRecord = await res.json();
          uploaded += 1;
          set((s) => ({ documents: [doc, ...s.documents] }));
        } catch {
          failed += 1;
        }
      }
      return { uploaded, failed };
    } finally {
      set({ uploading: false });
    }
  },

  deleteDocument: async (id) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete document");
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  getViewUrl: async (id) => {
    try {
      const res = await fetch(`/api/documents/${id}/url`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.url ?? null;
    } catch {
      return null;
    }
  },
}));
