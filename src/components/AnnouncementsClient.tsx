"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Megaphone, AlertTriangle, Info, Zap } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRIORITY_CONFIG: Record<string, { border: string; badge: string; icon: React.ReactNode; dot: string }> = {
  low:    { border: "border-l-slate-300", badge: "bg-slate-50 text-slate-600 border-slate-200",     icon: <Info className="w-4 h-4 text-slate-400" />,        dot: "bg-slate-400" },
  normal: { border: "border-l-blue-400",  badge: "bg-blue-50 text-blue-700 border-blue-200",        icon: <Megaphone className="w-4 h-4 text-blue-500" />,     dot: "bg-blue-500" },
  high:   { border: "border-l-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200",     icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, dot: "bg-amber-500" },
  urgent: { border: "border-l-red-500",   badge: "bg-red-50 text-red-600 border-red-200",           icon: <Zap className="w-4 h-4 text-red-500" />,            dot: "bg-red-500" },
};

export default function AnnouncementsClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const [addOpen, setAddOpen] = useState(false);
  const isAdminOrHR = ["super_admin","hr_admin"].includes(role);

  const { data: announcements, isLoading } = useSWR("/api/announcements", fetcher);
  const list = Array.isArray(announcements) ? announcements : [];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{list.length} announcements</p>
        {isAdminOrHR && (
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Announcement
          </Button>
        )}
      </div>

      {isAdminOrHR && (
        <Dialog open={addOpen} onOpenChange={setAddOpen} disablePointerDismissal>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <AddAnnouncementForm onSuccess={() => { setAddOpen(false); mutate("/api/announcements"); }} />
          </DialogContent>
        </Dialog>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Megaphone className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((ann: any) => {
            const cfg = PRIORITY_CONFIG[ann.priority] ?? PRIORITY_CONFIG.normal;
            return (
              <Card key={ann._id} className={`border-slate-200 shadow-sm border-l-4 ${cfg.border}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <h3 className="font-bold text-slate-900 leading-snug">{ann.title}</h3>
                        <Badge variant="outline" className={`text-xs flex-shrink-0 ${cfg.badge}`}>
                          {ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ann.content}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span>
                          Posted by{" "}
                          <span className="font-medium text-slate-500">
                            {ann.postedBy?.firstName} {ann.postedBy?.lastName}
                          </span>
                        </span>
                        <span>·</span>
                        <span>{formatDateTime(ann.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddAnnouncementForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", content: "", priority: "normal" });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else { toast.success("Announcement posted"); onSuccess(); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Announcement title" required />
      </div>
      <div className="space-y-1.5">
        <Label>Content *</Label>
        <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write your announcement…" rows={4} required />
      </div>
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <NativeSelect value={form.priority} onChange={(e) => set("priority", e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </NativeSelect>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
        {loading ? "Posting…" : "Post Announcement"}
      </Button>
    </form>
  );
}
