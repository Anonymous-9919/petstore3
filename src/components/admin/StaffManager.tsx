"use client";

import { FormEvent, useState } from "react";

type Role = "OWNER" | "MANAGER" | "ORDER_STAFF" | "INVENTORY_STAFF" | "CONTENT_MANAGER" | "VIEWER" | "DRIVER";
type Staff = { id: string; name: string; email: string; role: Role; status: "ACTIVE" | "DISABLED"; createdAt: string };
type Form = { name: string; email: string; password: string; role: Role; status: "ACTIVE" | "DISABLED" };

const empty: Form = { name: "", email: "", password: "", role: "MANAGER", status: "ACTIVE" };
const roleLabel: Record<Role, string> = { OWNER: "Owner", MANAGER: "Manager", ORDER_STAFF: "Order staff", INVENTORY_STAFF: "Inventory staff", CONTENT_MANAGER: "Content manager", VIEWER: "Viewer", DRIVER: "Driver" };

export function StaffManager({ initialStaff }: { initialStaff: Staff[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/staff");
      if (!response.ok) throw new Error();
      setStaff(await response.json());
    } catch { setError("Unable to load staff members."); }
  }


  function change<Key extends keyof Form>(key: Key, value: Form[Key]) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(editing ? `/api/admin/staff/${editing}` : "/api/admin/staff", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!response.ok) return setError((await response.json()).error ?? "Unable to save staff member.");
    setForm(empty); setEditing(null); void load();
  }

  function edit(member: Staff) {
    setEditing(member.id);
    setForm({ name: member.name, email: member.email, password: "", role: member.role, status: member.status });
    setError("");
  }

  return <div className="space-y-6">
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-black/10 bg-white p-5 md:grid-cols-2">
      <h2 className="md:col-span-2 text-lg font-bold">{editing ? "Edit staff member" : "Add staff member"}</h2>
      <Input label="Name" value={form.name} onChange={(value) => change("name", value)} required />
      <Input label="Email" type="email" value={form.email} onChange={(value) => change("email", value)} required />
      <Input label={editing ? "New password (leave blank to keep current)" : "Password"} type="password" value={form.password} onChange={(value) => change("password", value)} required={!editing} />
      <label className="grid gap-1 text-sm font-medium">Role<select value={form.role} onChange={(event) => change("role", event.target.value as Role)} className="rounded border border-black/15 px-3 py-2 font-normal">{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {editing && <label className="grid gap-1 text-sm font-medium">Status<select value={form.status} onChange={(event) => change("status", event.target.value as Form["status"])} className="rounded border border-black/15 px-3 py-2 font-normal"><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></label>}
      {error && <p role="alert" className="md:col-span-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2 md:col-span-2"><button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white">{editing ? "Save changes" : "Create staff member"}</button>{editing && <button type="button" onClick={() => { setForm(empty); setEditing(null); setError(""); }} className="rounded border border-black/15 px-4 py-2 text-sm font-semibold">Cancel</button>}</div>
    </form>
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-black/10 text-[#666]"><tr><th className="px-4 py-3">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th className="px-4">Action</th></tr></thead><tbody>{staff.map((member) => <tr key={member.id} className="border-b border-black/5"><td className="px-4 py-3 font-medium">{member.name}</td><td>{member.email}</td><td>{roleLabel[member.role]}</td><td>{member.status === "ACTIVE" ? "Active" : "Disabled"}</td><td>{new Date(member.createdAt).toLocaleDateString()}</td><td className="px-4"><button onClick={() => edit(member)} className="font-semibold text-brand">Edit</button></td></tr>)}{staff.length === 0 && <tr><td className="px-4 py-8 text-[#666]" colSpan={6}>No staff members yet.</td></tr>}</tbody></table></div>
  </div>;
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-medium">{label}<input type={type} value={value} required={required} minLength={type === "password" ? 8 : undefined} onChange={(event) => onChange(event.target.value)} className="rounded border border-black/15 px-3 py-2 font-normal" /></label>;
}
