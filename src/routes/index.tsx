import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Trophy, Wallet, ArrowRight, Check, Share2, Gift } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" aria-hidden />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Earn rewards on autopilot</span>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Refer friends.
              <br />
              <span className="text-gradient">Earn real rewards.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Share your unique link, complete simple tasks, and watch your points grow.
              Cash out whenever you're ready.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="hero">
                <Link to="/signup">
                  Start earning <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/login">I have an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-10 sm:px-6">
          {[
            { v: "10k+", l: "Active users" },
            { v: "$250k", l: "Paid out" },
            { v: "4.9★", l: "User rating" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold text-gradient sm:text-4xl">{s.v}</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">Three simple steps to start earning today.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, t: "Sign up free", d: "Create your account in seconds and grab your unique referral link." },
            { icon: Share2, t: "Share & complete tasks", d: "Invite friends and finish quick tasks to stack up points." },
            { icon: Wallet, t: "Cash out", d: "Request a withdrawal anytime — admins approve and you get paid." },
          ].map((f, i) => (
            <div key={f.t} className="relative rounded-2xl border border-border bg-gradient-card p-6 shadow-md transition-all hover:shadow-elegant hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-xs font-semibold text-primary">STEP {i + 1}</div>
              <h3 className="mt-1 text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to earn</h2>
              <p className="mt-3 text-muted-foreground">
                A complete platform with tasks, referrals, and instant payout requests — all in one place.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Unique referral link for every user",
                  "Track earnings & referrals in real time",
                  "Submit photo proof for tasks",
                  "Admin reviews keep things fair",
                  "Withdraw points anytime",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                      <Check className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl" aria-hidden />
              <div className="relative space-y-3">
                {[
                  { icon: Trophy, label: "Total Earned", value: "12,450 pts" },
                  { icon: Users, label: "Referrals", value: "28 friends" },
                  { icon: Gift, label: "Tasks Done", value: "47 / 50" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
                      <c.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                      <div className="text-xl font-bold">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-elegant sm:p-16">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-5xl">
            Ready to start earning?
          </h2>
          <p className="mt-4 text-primary-foreground/90">
            Join thousands earning rewards every day. It's free.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="xl" className="bg-background text-foreground hover:bg-background/90">
              <Link to="/signup">
                Create my account <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} ReferEarn. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
