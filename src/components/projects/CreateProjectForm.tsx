"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge }    from "@/components/ui/badge";
import { toast }    from "sonner";
import { X, Check } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function autoKey(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 6).toUpperCase();
}

interface Props {
  editData?: any;
  onSuccess: (project: any) => void;
  onCancel: () => void;
}

export default function CreateProjectForm({ editData, onSuccess, onCancel }: Props) {
  const isEdit = !!editData;

  const { data: empData }  = useSWR("/api/employees", fetcher);
  const { data: deptData } = useSWR("/api/departments", fetcher);
  const { data: poData }   = useSWR("/api/purchase-orders?status=all", fetcher);

  const empList  = Array.isArray(empData)  ? empData  : (empData?.employees  ?? []);
  const deptList = Array.isArray(deptData) ? deptData : (deptData?.departments ?? []);
  const poList   = poData?.pos ?? [];

  const [name,        setName]        = useState("");
  const [key,         setKey]         = useState("");
  const [keyTouched,  setKeyTouched]  = useState(false);
  const [description, setDescription] = useState("");
  const [type,        setType]        = useState("internal");
  const [status,      setStatus]      = useState("planning");
  const [priority,    setPriority]    = useState("medium");
  const [manager,     setManager]     = useState("");
  const [team,        setTeam]        = useState<string[]>([]);
  const [department,  setDepartment]  = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [startDate,   setStartDate]   = useState("");
  const [dueDate,     setDueDate]     = useState("");
  const [tags,        setTags]        = useState<string[]>([]);
  const [tagInput,    setTagInput]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [teamOpen,    setTeamOpen]    = useState(false);

  useEffect(() => {
    if (!editData) return;
    setName(editData.name ?? "");
    setKey(editData.key ?? "");
    setDescription(editData.description ?? "");
    setType(editData.type ?? "internal");
    setStatus(editData.status ?? "planning");
    setPriority(editData.priority ?? "medium");
    setManager(editData.manager?._id ?? editData.manager ?? "");
    setTeam((editData.team ?? []).map((m: any) => m._id ?? m));
    setDepartment(editData.department?._id ?? editData.department ?? "");
    setPurchaseOrder(editData.purchaseOrder?._id ?? editData.purchaseOrder ?? "");
    setStartDate(editData.startDate ? new Date(editData.startDate).toISOString().slice(0,10) : "");
    setDueDate(editData.dueDate ? new Date(editData.dueDate).toISOString().slice(0,10) : "");
    setTags(editData.tags ?? []);
    setKeyTouched(true);
  }, [editData]);

  useEffect(() => {
    if (!keyTouched && name) setKey(autoKey(name));
  }, [name, keyTouched]);

  function toggleTeam(id: string) {
    setTeam((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase();
      if (!tags.includes(t)) setTags((p) => [...p, t]);
      setTagInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Project name is required");
    if (!key.trim())  return toast.error("Project key is required");

    const body = {
      name: name.trim(),
      key:  key.trim().toUpperCase(),
      description: description.trim() || undefined,
      type, status, priority,
      manager:       manager       || null,
      team,
      department:    department    || null,
      purchaseOrder: purchaseOrder || null,
      startDate:     startDate     || null,
      dueDate:       dueDate       || null,
      tags,
    };

    setSaving(true);
    try {
      const url    = isEdit ? `/api/projects/${editData._id}` : "/api/projects";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(isEdit ? "Project updated" : "Project created");
      onSuccess(data);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedEmployees = empList.filter((e: any) => team.includes(e._id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Section title="Project Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Project Name <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Project Key <span className="text-red-500">*</span></Label>
            <Input
              value={key}
              onChange={(e) => { setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")); setKeyTouched(true); }}
              placeholder="WEB"
              maxLength={6}
              className="mt-1 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Used as task prefix: {key || "KEY"}-1, {key || "KEY"}-2…</p>
          </div>
          <div>
            <Label>Type</Label>
            <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="mt-1">
              <option value="internal">Internal</option>
              <option value="client">Client</option>
            </NativeSelect>
          </div>
          <div>
            <Label>Status</Label>
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </NativeSelect>
          </div>
          <div>
            <Label>Priority</Label>
            <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </NativeSelect>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this project about?"
              className="mt-1 resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Dates */}
      <Section title="Timeline">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>
        </div>
      </Section>

      {/* Team */}
      <Section title="Team">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Project Manager</Label>
            <NativeSelect value={manager} onChange={(e) => setManager(e.target.value)} className="mt-1">
              <option value="">— Select manager —</option>
              {empList.map((e: any) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label>Department</Label>
            <NativeSelect value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1">
              <option value="">— Select department —</option>
              {deptList.map((d: any) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* Team members */}
        <div className="mt-4">
          <Label>Team Members</Label>
          {selectedEmployees.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {selectedEmployees.map((e: any) => (
                <span key={e._id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  {e.firstName} {e.lastName}
                  <button type="button" onClick={() => toggleTeam(e._id)} className="hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setTeamOpen((v) => !v)}
            className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {teamOpen ? "Hide employee list" : `+ Add team members${selectedEmployees.length ? ` (${selectedEmployees.length} selected)` : ""}`}
          </button>
          {teamOpen && (
            <div className="mt-2 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
              {empList.map((e: any) => {
                const selected = team.includes(e._id);
                return (
                  <button
                    key={e._id}
                    type="button"
                    onClick={() => toggleTeam(e._id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{e.firstName} {e.lastName}</p>
                      <p className="text-xs text-slate-400">{e.designation || e.department?.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* Linked PO */}
      <Section title="Purchase Order (Optional)">
        <div>
          <Label>Link to Purchase Order</Label>
          <NativeSelect value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)} className="mt-1">
            <option value="">— None —</option>
            {poList.map((po: any) => (
              <option key={po._id} value={po._id}>{po.poNumber} — {po.clientName} (₹{(po.totalAmount ?? 0).toLocaleString("en-IN")})</option>
            ))}
          </NativeSelect>
        </div>
      </Section>

      {/* Tags */}
      <Section title="Tags">
        <div>
          <Label>Tags</Label>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder="Type a tag and press Enter"
            className="mt-1"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t) => (
                <Badge key={t} variant="outline" className="gap-1 pr-1 text-xs">
                  {t}
                  <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Section>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1.5 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}
