import { AppLayout } from "@/components/layout";
import { useGetAnalysis, getGetAnalysisQueryKey, useSubmitSuggestionFeedback } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Check, X, Loader2, Sparkles, TrendingUp, TrendingDown, Target, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";

export default function AnalysisDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analysis, isLoading, error } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id)
    }
  });

  const submitFeedback = useSubmitSuggestionFeedback();

  const handleFeedback = (suggestionId: string, status: "accepted" | "rejected") => {
    submitFeedback.mutate(
      { id, data: { suggestionId, status } },
      {
        onSuccess: () => {
          queryClient.setQueryData(getGetAnalysisQueryKey(id), (old: any) => {
            if (!old) return old;
            return {
              ...old,
              suggestions: old.suggestions.map((s: any) =>
                s.id === suggestionId ? { ...s, status } : s
              )
            };
          });

          toast({
            title: status === "accepted" ? "Action accepted" : "Action rejected",
            description: status === "accepted" ? "Saved to your calibration memory." : "Your feedback will tune future plans."
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to submit feedback. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32 w-full md:col-span-2" />
            <Skeleton className="h-32 w-full md:col-span-1" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !analysis) {
    return (
      <AppLayout>
        <div className="text-center py-12 max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4">Analysis not found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find the insights you're looking for.</p>
          <Button onClick={() => setLocation("/app")}>Return to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  const metrics = analysis.metrics;
  const isGoodEngagement = metrics.engagementRate >= 3.0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <Button variant="ghost" className="mb-2 -ml-4" onClick={() => setLocation("/app")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                {analysis.source === "screenshot" ? "Screenshot Confirmed" : "Manual Confirmed"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
                })}
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Completed Action Plan</h1>
            {metrics.postTopic && (
              <p className="text-xl text-muted-foreground mt-2 font-medium">"{metrics.postTopic}"</p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm min-w-32">
              <span className="text-sm font-medium text-muted-foreground mb-1">Engagement</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{metrics.engagementRate.toFixed(1)}%</span>
                {isGoodEngagement ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm min-w-32">
              <span className="text-sm font-medium text-muted-foreground mb-1">Reach</span>
              <span className="text-2xl font-bold">{metrics.reach.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Insight</h2>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
                <p className="text-lg leading-relaxed text-foreground font-medium">
                  {analysis.summary}
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                  <Target className="w-4 h-4" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Benchmark Comparison</h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-foreground leading-relaxed">{analysis.brutallyHonestTake}</p>
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Exactly 3 Action Items</h2>
                </div>
              </div>
              <div className="space-y-4">
                {analysis.suggestions.map((suggestion, index) => (
                  <Card key={suggestion.id} className={`overflow-hidden transition-all duration-300 ${suggestion.status === "accepted" ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : suggestion.status === "rejected" ? "opacity-50 grayscale border-border/50" : "border-primary/20 shadow-md"}`}>
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-3">Action {index + 1}</Badge>
                          <CardTitle className="text-xl mb-1">{suggestion.title}</CardTitle>
                        </div>
                        {suggestion.status !== "pending" && (
                          <Badge variant="outline" className={suggestion.status === "accepted" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                            {suggestion.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid gap-3">
                        <ActionField label="WHY it matters" value={suggestion.rationale} />
                        <ActionField label="HOW to do it" value={suggestion.action} />
                        <ActionField label="WHEN to do it" value={suggestion.actionWhen} icon={<Clock className="w-4 h-4" />} />
                      </div>

                      {suggestion.status === "pending" && (
                        <div className="flex gap-2 justify-end border-t border-border pt-4">
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30"
                            onClick={() => handleFeedback(suggestion.id, "rejected")}
                            disabled={submitFeedback.isPending}
                          >
                            <X className="w-4 h-4 mr-2" /> Reject
                          </Button>
                          <Button
                            className="bg-green-500 hover:bg-green-600 text-white shadow-sm"
                            onClick={() => handleFeedback(suggestion.id, "accepted")}
                            disabled={submitFeedback.isPending}
                          >
                            {submitFeedback.isPending && submitFeedback.variables?.data?.suggestionId === suggestion.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            Accept
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg">Confirmed Metrics</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <dl className="space-y-3">
                  <MetricRow label="Format" value={metrics.contentFormat.replace("_", " ")} />
                  <MetricRow label="Impressions" value={metrics.impressions.toLocaleString()} />
                  <MetricRow label="Follower Change" value={`${metrics.followerChange > 0 ? "+" : ""}${metrics.followerChange}`} />
                  <MetricRow label="Saves" value={metrics.saves.toLocaleString()} />
                  <MetricRow label="Shares" value={metrics.shares.toLocaleString()} />
                  <MetricRow label="Profile Visits" value={metrics.profileVisits.toLocaleString()} />
                  <MetricRow label="Link Clicks" value={metrics.linkClicks.toLocaleString()} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ActionField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-background rounded-lg p-3 border border-border">
      <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1 mb-1 tracking-wider">{icon}{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold capitalize">{value}</dd>
    </div>
  );
}
