"use client";

import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { useDocumentsStore } from "@/store/documents-store";
import { TableSkeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_STYLES: Record<string, string> = {
  stored: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  queued: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  review: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
};

export default function DocumentsPage() {
  const { documents, loading, uploading, fetchDocuments, uploadDocuments, deleteDocument, getViewUrl } =
    useDocumentsStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const tooLarge = files.filter((f) => f.size > MAX_FILE_SIZE);
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE);
    if (tooLarge.length > 0) {
      toast.error(`${tooLarge.length} file(s) exceed the 20MB limit and were skipped`);
    }
    if (valid.length === 0) return;
    const { uploaded, failed } = await uploadDocuments(valid);
    if (uploaded > 0) toast.success(`${uploaded} document${uploaded === 1 ? "" : "s"} uploaded`);
    if (failed > 0) toast.error(`${failed} upload${failed === 1 ? "" : "s"} failed`);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
      toast.success("Document deleted");
    } catch {
      toast.error("Could not delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (id: string) => {
    const url = await getViewUrl(id);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Could not open document");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <Toaster position="top-center" />
      <div>
        <h1 className="text-xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Receipts, statements, invoices, and other supporting files.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Upload documents</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receipts, statements, invoices, PDFs, images, or spreadsheets — up to 20MB each
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            )}
            <p className="font-medium text-sm">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Multiple files supported</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Vault</p>
        </CardHeader>
        <CardContent className="p-0">
          {loading && documents.length === 0 ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload a file above to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{formatSize(doc.size)}</span>
                        <span className="text-[11px] text-muted-foreground uppercase">{doc.source}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STATUS_STYLES[doc.status] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleView(doc.id)}
                      title="View"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      title="Delete"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
