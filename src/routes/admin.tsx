import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Coins, ListChecks, Wallet, Loader2, Plus, Trash2, Check, X, Eye, ShieldOff, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
});

interface Profile { id: string; email: string; referral_code: string; points_balance: number; status: string; created_at: string; }
interface Task { id: string; title: string; description: string; task_type: string; reward_points: number; active: boolean; requires_proof: boolean; }
interface SubmissionRow { id: string; task_id: string; user_id: string; status: string; proof_url: string | null; notes: string | null; created_at: string; tasks?: { title: string; reward_points: number } | null; profiles?: { email: string } | null; }
interface WithdrawalRow { id: string; user_id: string; points: number; payout_method: string; payout_details: string; status: string; created_at: string; admin_notes: string | null; profiles?: { email: string } | null; }

function AdminPanel() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/dashboard" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage users, tasks, submissions and payouts</p>
          </div>
        </div>

        <AnalyticsSection />

        <Tabs defaultValue="submissions" className="mt-8">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto sm:inline-grid">
            <TabsTrigger value="submissions">Reviews</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions" className="mt-4"><SubmissionsTab /></TabsContent>
          <TabsContent value="tasks" className="mt-4"><TasksTab adminId={user.id} /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="withdrawals" className="mt-4"><WithdrawalsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AnalyticsSection() {
  const [stats, setStats] = useState({ users: 0, tasks: 0, pending: 0, points: 0 });
  useEffect(() => {
    void (async () => {
      const [{ count: u }, { count: t }, { count: p }, { data: pts }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("task_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("points_balance"),
      ]);
      const total = (pts ?? []).reduce((acc, r) => acc + (r.points_balance ?? 0), 0);
      setStats({ users: u ?? 0, tasks: t ?? 0, pending: p ?? 0, points: total });
    })();
  }, []);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={Users} label="Total users" value={stats.users.toString()} />
      <Stat icon={ListChecks} label="Active tasks" value={stats.tasks.toString()} />
      <Stat icon={Eye} label="Pending reviews" value={stats.pending.toString()} accent />
      <Stat icon={Coins} label="Points in circulation" value={stats.points.toLocaleString()} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/30 bg-gradient-card shadow-elegant" : "border-border/60"}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent ? "bg-gradient-primary shadow-glow" : "bg-muted"}`}>
          <Icon className={`h-6 w-6 ${accent ? "text-primary-foreground" : "text-foreground"}`} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Submissions Tab ───── */
function SubmissionsTab() {
  const [items, setItems] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("task_submissions")
      .select("*, tasks(title, reward_points)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const rows = (data ?? []) as unknown as SubmissionRow[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const map = new Map((profs ?? []).map((p) => [p.id, { email: p.email }]));
      rows.forEach((r) => { r.profiles = map.get(r.user_id) ?? null; });
    }
    setItems(rows);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const review = async (sub: SubmissionRow, status: "approved" | "rejected", notes: string) => {
    const { error } = await supabase.from("task_submissions").update({
      status, review_notes: notes || null, reviewed_at: new Date().toISOString(),
    }).eq("id", sub.id);
    if (error) { toast.error(error.message); return; }
    if (status === "approved" && sub.tasks) {
      // Award points: read current then update
      const { data: p } = await supabase.from("profiles").select("points_balance").eq("id", sub.user_id).maybeSingle();
      if (p) {
        await supabase.from("profiles").update({ points_balance: p.points_balance + sub.tasks.reward_points }).eq("id", sub.user_id);
      }
    }
    toast.success(status === "approved" ? "Approved & points awarded" : "Rejected");
    void load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "hero" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>
      {loading && <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>}
      {!loading && items.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No submissions.</CardContent></Card>}
      {items.map((s) => <SubmissionCard key={s.id} sub={s} onReview={review} />)}
    </div>
  );
}

function SubmissionCard({ sub, onReview }: { sub: SubmissionRow; onReview: (s: SubmissionRow, status: "approved" | "rejected", notes: string) => Promise<void> }) {
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const viewProof = async () => {
    if (!sub.proof_url) return;
    const { data } = await supabase.storage.from("submissions").createSignedUrl(sub.proof_url, 300);
    if (data) setProofUrl(data.signedUrl);
    setOpen(true);
  };

  const act = async (status: "approved" | "rejected") => {
    setBusy(true);
    await onReview(sub, status, notes);
    setBusy(false);
    setOpen(false);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{sub.tasks?.title ?? "Task"}</span>
            <Badge variant="outline">+{sub.tasks?.reward_points ?? 0} pts</Badge>
            <Badge variant="outline" className={sub.status === "pending" ? "bg-warning/15" : sub.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>{sub.status}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{sub.profiles?.email} · {new Date(sub.created_at).toLocaleString()}</div>
          {sub.notes && <div className="mt-2 text-sm">📝 {sub.notes}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {sub.proof_url && <Button variant="outline" size="sm" onClick={viewProof}><Eye className="h-4 w-4" /> Proof</Button>}
          {sub.status === "pending" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="hero" size="sm">Review</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Review submission</DialogTitle></DialogHeader>
                {proofUrl && (
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                    <img src={proofUrl} alt="Proof" className="max-h-72 w-full rounded-lg object-contain border border-border" />
                  </a>
                )}
                <div className="space-y-2">
                  <Label>Review notes (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Reason for approval/rejection..." />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => act("rejected")} disabled={busy}><X className="h-4 w-4" /> Reject</Button>
                  <Button variant="success" onClick={() => act("approved")} disabled={busy}><Check className="h-4 w-4" /> Approve</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Tasks Tab ───── */
const taskSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(500),
  task_type: z.string().trim().min(2).max(30),
  reward_points: z.number().int().min(1).max(10000),
});

function TasksTab({ adminId }: { adminId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks((data ?? []) as Task[]);
  };
  useEffect(() => { void load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  };

  const toggle = async (t: Task) => {
    const { error } = await supabase.from("tasks").update({ active: !t.active }).eq("id", t.id);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> New task</Button></DialogTrigger>
          <NewTaskDialog adminId={adminId} onCreated={() => { setOpen(false); void load(); }} />
        </Dialog>
      </div>
      {tasks.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No tasks. Create your first one.</CardContent></Card>}
      {tasks.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t.title}</h3>
                <Badge variant="outline">{t.task_type}</Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary">+{t.reward_points}</Badge>
                {!t.active && <Badge variant="outline" className="bg-muted">inactive</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={t.active} onCheckedChange={() => toggle(t)} />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <Button variant="outline" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NewTaskDialog({ adminId, onCreated }: { adminId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("social");
  const [reward, setReward] = useState("10");
  const [requiresProof, setRequiresProof] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = taskSchema.safeParse({ title, description, task_type: type, reward_points: Number(reward) });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      ...parsed.data, requires_proof: requiresProof, created_by: adminId, active: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Task created!");
    setTitle(""); setDescription(""); setReward("10");
    onCreated();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create new task</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="signup">Signup</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Reward (points)</Label><Input type="number" min={1} value={reward} onChange={(e) => setReward(e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={requiresProof} onCheckedChange={setRequiresProof} />
          <Label>Requires proof image</Label>
        </div>
      </div>
      <DialogFooter><Button variant="hero" onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button></DialogFooter>
    </DialogContent>
  );
}

/* ───── Users Tab ───── */
function UsersTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data ?? []) as Profile[]);
  };
  useEffect(() => { void load(); }, []);

  const toggleStatus = async (u: Profile) => {
    const next = u.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", u.id);
    if (error) toast.error(error.message);
    else { toast.success(`User ${next}`); void load(); }
  };
  const remove = async (u: Profile) => {
    if (!confirm(`Delete ${u.email}? This removes their profile data only (auth account remains).`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  };

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{u.email}</span>
                <Badge variant="outline" className={u.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>{u.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Code: <span className="font-mono">{u.referral_code}</span> · {u.points_balance.toLocaleString()} pts · joined {new Date(u.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleStatus(u)}>
                {u.status === "active" ? <><ShieldOff className="h-4 w-4" /> Suspend</> : <><ShieldCheck className="h-4 w-4" /> Activate</>}
              </Button>
              <Button variant="outline" size="icon" onClick={() => remove(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ───── Withdrawals Tab ───── */
function WithdrawalsTab() {
  const [items, setItems] = useState<WithdrawalRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = useCallback(async () => {
    let q = supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const rows = (data ?? []) as unknown as WithdrawalRow[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const map = new Map((profs ?? []).map((p) => [p.id, { email: p.email }]));
      rows.forEach((r) => { r.profiles = map.get(r.user_id) ?? null; });
    }
    setItems(rows);
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const act = async (w: WithdrawalRow, status: "approved" | "rejected", notes: string) => {
    const { error } = await supabase.from("withdrawals").update({
      status, admin_notes: notes || null, reviewed_at: new Date().toISOString(),
    }).eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    if (status === "approved") {
      const { data: p } = await supabase.from("profiles").select("points_balance").eq("id", w.user_id).maybeSingle();
      if (p) {
        const newBal = Math.max(0, p.points_balance - w.points);
        await supabase.from("profiles").update({ points_balance: newBal }).eq("id", w.user_id);
      }
    }
    toast.success(status === "approved" ? "Approved — points deducted" : "Rejected");
    void load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "hero" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>
      {items.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No withdrawals.</CardContent></Card>}
      {items.map((w) => <WithdrawalReviewCard key={w.id} w={w} onAct={act} />)}
    </div>
  );
}

function WithdrawalReviewCard({ w, onAct }: { w: WithdrawalRow; onAct: (w: WithdrawalRow, status: "approved" | "rejected", notes: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (status: "approved" | "rejected") => {
    setBusy(true); await onAct(w, status, notes); setBusy(false); setOpen(false);
  };
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{w.points.toLocaleString()} pts</span>
            <Badge variant="outline">{w.payout_method}</Badge>
            <Badge variant="outline" className={w.status === "pending" ? "bg-warning/15" : w.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>{w.status}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{w.profiles?.email} · {new Date(w.created_at).toLocaleString()}</div>
          <div className="mt-1 text-xs">Payout: <span className="font-mono">{w.payout_details}</span></div>
        </div>
        {w.status === "pending" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero" size="sm"><Wallet className="h-4 w-4" /> Review</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Review withdrawal — {w.points.toLocaleString()} pts</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <div><strong>Method:</strong> {w.payout_method}</div>
                <div><strong>Details:</strong> {w.payout_details}</div>
                <Label>Admin notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => submit("rejected")} disabled={busy}><X className="h-4 w-4" /> Reject</Button>
                <Button variant="success" onClick={() => submit("approved")} disabled={busy}><Check className="h-4 w-4" /> Approve & deduct</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
