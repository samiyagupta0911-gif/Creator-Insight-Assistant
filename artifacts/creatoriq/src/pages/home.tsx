import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, useAuth } from "@clerk/clerk-react";
import { Link } from "wouter";
import { ArrowRight, BarChart2, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="container mx-auto px-4 h-20 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            IQ
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">CreatorIQ</span>
        </div>
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <Link href="/app" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" className="font-medium text-foreground">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="font-medium">Get Started</Button>
              </SignUpButton>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="py-24 px-4 container mx-auto text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-primary/20 bg-primary/10 text-primary mb-8">
            Your AI Strategist
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl mx-auto mb-6 leading-tight">
            Stop guessing.<br/>Start growing.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            CreatorIQ translates your overwhelming Instagram analytics into brutal honesty, clear answers, and concrete next steps.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {isSignedIn ? (
              <Link href="/app" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-lg">
                Enter Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <Button size="lg" className="h-12 px-8 text-lg w-full sm:w-auto">
                  Start Your Growth <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
            )}
          </div>
        </section>

        <section className="py-24 bg-card px-4 border-t border-border/50">
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm flex flex-col items-start text-left">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Screenshot to Insight</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Just upload a screenshot of your Instagram analytics. We extract the data and tell you exactly what it means.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm flex flex-col items-start text-left">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Brutal Honesty</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No fluff. We give you a brutally honest take on why a post bombed or why it went viral.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm flex flex-col items-start text-left">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Concrete Actions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get a step-by-step content plan and actionable suggestions you can accept or reject.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background py-12 px-4 border-t border-border/40 text-center">
        <p className="text-muted-foreground font-medium">© {new Date().getFullYear()} CreatorIQ. Build for the independent creator.</p>
      </footer>
    </div>
  );
}
