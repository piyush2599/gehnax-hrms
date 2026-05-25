"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import { FileText, Upload, Trash2, Download, Loader2, FilePlus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Offer Letter",
  "Experience Letter",
  "Education Certificate",
  "Passport",
  "Driving License",
  "Other",
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  employeeId: string;
  canUpload?: boolean;
}

export default function EmployeeDocuments({ employeeId, canUpload = true }: Props) {
  const { data, isLoading, mutate: revalidate } = useSWR(
    `/api/employees/${employeeId}/documents`,
    fetcher
  );

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const documents: any[] = data?.documents || [];

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file"); return; }
    if (!docName.trim()) { toast.error("Please enter a document name"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", docName.trim());
      fd.append("type", docType);

      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Upload failed"); return; }

      toast.success("Document uploaded");
      setFile(null);
      setDocName("");
      setDocType(DOC_TYPES[0]);
      if (fileRef.current) fileRef.current.value = "";
      revalidate();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${docId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Delete failed"); return; }
      toast.success("Document removed");
      revalidate();
    } finally {
      setDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      {canUpload && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FilePlus className="w-3.5 h-3.5" />
            Upload Document
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Document Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Aadhaar Card"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Document Type</Label>
              <NativeSelect
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="h-8 text-sm"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File (PDF or image, max 10 MB)</Label>
            <div className="flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-500"
              />
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={uploading || !file}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl"
            >
              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {doc.type} · {doc.uploadedAt ? formatDate(doc.uploadedAt) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/api/employees/${employeeId}/documents/${doc._id}`} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </a>
                {canUpload && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(doc._id)}
                    disabled={deleting === doc._id}
                    className="h-7 px-2.5 border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200"
                  >
                    {deleting === doc._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
