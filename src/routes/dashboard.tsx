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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Coins, Users, CheckCircle2, Clock, XCircle, Wallet, Loader2, Upload, Share2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

interface Profile {
  id: string; email: string; referral_code: string; points_balance: number; status: string;
}
interface Task {
  id: string; title: string; description: string; task_type: string; reward_points: number; requires_proof: boolean;
}
interface Submission {
  id: string; task_id: string; status: string; review_notes: string | null; created_at: string;
}
interface Withdrawal {
  id: string; points: number; payout_method: string; status: string; created_at: string; admin_notes: string | null;
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: t }, { data: subs }, { count }, { data: wd }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("tasks").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("task_submissions").select("*").eq("user_id", user.id),
      supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(prof as Profile | null);
    setTasks((t ?? []) as Task[]);
    setSubmissions((subs ?? []) as Submission[]);
    setReferralCount(count ?? 0);
    setWithdrawals((wd ?? []) as Withdrawal[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/signup?ref=${profile.referral_code}`;
  const copyLink = () => {
    void navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };
  const copyCode = () => {
    void navigator.clipboard.writeText(profile.referral_code);
    toast.success("Code copied!");
  };

  const submissionFor = (taskId: string) => submissions.find((s) => s.task_id === taskId);
  const tasksDone = submissions.filter((s) => s.status === "approved").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Welcome back 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Coins} label="Points balance" value={profile.points_balance.toLocaleString()} accent />
          <StatCard icon={Users} label="Referrals" value={referralCount.toString()} />
          <StatCard icon={CheckCircle2} label="Tasks done" value={tasksDone.toString()} />
          <StatCard icon={Clock} label="Pending review" value={submissions.filter((s) => s.status === "pending").length.toString()} />
        </div>

        {/* Referral card */}
        <Card className="mt-6 overflow-hidden border-border/60 shadow-md">
          <div className="bg-gradient-hero p-6 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Your referral link</h2>
            </div>
            <p className="mt-1 text-sm text-primary-foreground/90">
              Earn <strong>50 points</strong> for every friend who signs up.
            </p>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your code</Label>
              <div className="flex gap-2">
                <Input value={profile.referral_code} readOnly className="font-mono text-base font-bold" />
                <Button variant="outline" size="icon" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Share link</Label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="text-xs sm:text-sm" />
                <Button variant="hero" onClick={copyLink}><Copy className="h-4 w-4" /> Copy</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="mt-8">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            {tasks.length === 0 && (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No tasks available right now. Check back soon!</CardContent></Card>
            )}
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} submission={submissionFor(task.id)} userId={user!.id} onChange={load} />
            ))}
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4 space-y-4">
            <WithdrawForm balance={profile.points_balance} userId={user!.id} onSubmitted={load} />
            <div className="space-y-2">
              {withdrawals.length === 0 && (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No withdrawals yet.</CardContent></Card>
              )}
              {withdrawals.map((w) => (
                <Card key={w.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="font-medium">{w.points.toLocaleString()} pts → {w.payout_method}</div>
                      <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</div>
                      {w.admin_notes && <div className="mt-1 text-xs text-muted-foreground">Note: {w.admin_notes}</div>}
                    </div>
                    <StatusBadge status={w.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: "default" | "secondary" | "destructive" | "outline"; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { v: "secondary", cls: "bg-warning/15 text-warning-foreground border-warning/30", icon: Clock },
    approved: { v: "default", cls: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
    rejected: { v: "destructive", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  };
  const cfg = map[status] ?? map.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cfg.cls}>
      <Icon className="mr-1 h-3 w-3" /> {status}
    </Badge>
  );
}

function TaskRow({ task, submission, userId, onChange }: { task: Task; submission?: Submission; userId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (task.requires_proof && !file) {
      toast.error("Please upload a proof image");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setBusy(true);
    let proofUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${task.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("submissions").upload(path, file);
      if (upErr) {
        toast.error(upErr.message);
        setBusy(false);
        return;
      }
      proofUrl = path;
    }
    const { error } = await supabase.from("task_submissions").insert({
      task_id: task.id, user_id: userId, proof_url: proofUrl, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Submitted! Awaiting admin review.");
    setOpen(false);
    setNotes(""); setFile(null);
    onChange();
  };

  return (
    <Card className="border-border/60 transition-all hover:border-primary/40 hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{task.title}</h3>
            <Badge variant="outline" className="text-xs">{task.task_type}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Reward</div>
            <div className="font-bold text-primary">+{task.reward_points} pts</div>
          </div>
          {submission ? (
            <StatusBadge status={submission.status} />
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm">Submit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{task.title}</DialogTitle>
                  <DialogDescription>{task.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {task.requires_proof && (
                    <div className="space-y-2">
                      <Label htmlFor="proof">Proof image</Label>
                      <Input id="proof" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      <p className="text-xs text-muted-foreground">JPG/PNG, max 5MB</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Add any context for the reviewer..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button variant="hero" onClick={submit} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
      {submission?.review_notes && (
        <CardContent className="border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
          Review note: {submission.review_notes}
        </CardContent>
      )}
    </Card>
  );
}

const wdSchema = z.object({
  points: z.number().int().min(100, "Minimum 100 points").max(1_000_000),
  method: z.string().trim().min(2).max(50),
  details: z.string().trim().min(3).max(255),
});

function WithdrawForm({ balance, userId, onSubmitted }: { balance: number; userId: string; onSubmitted: () => void }) {
  const [points, setPoints] = useState("");
  const [method, setMethod] = useState("PayPal");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(points);
    const parsed = wdSchema.safeParse({ points: p, method, details });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (p > balance) { toast.error("Not enough points"); return; }
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId, points: p, payout_method: parsed.data.method, payout_details: parsed.data.details,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal request submitted!");
    setPoints(""); setDetails("");
    onSubmitted();
  };

  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Wallet className="h-5 w-5 text-primary" /> Request withdrawal</CardTitle>
        <CardDescription>Available: <strong>{balance.toLocaleString()} pts</strong> · Min 100 pts</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Points to withdraw</Label>
            <Input type="number" min={100} max={balance} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="100" required />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="PayPal, Bank transfer..." required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Payout details</Label>
            <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="email@paypal.com or account #" required />
          </div>
          <Button type="submit" variant="hero" className="sm:col-span-2" disabled={busy || balance < 100}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
