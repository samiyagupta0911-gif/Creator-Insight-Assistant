import { AppLayout } from "@/components/layout";
import { useGetAnalysis, getGetAnalysisQueryKey, useSubmitSuggestionFeedback } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Check, X, Loader2, Sparkles, TrendingUp, TrendingDown, Minus, Target, HelpCircle, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
          // Update cache locally instead of full invalidate to prevent jitter
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
            description: status === "accepted" ? "Added to your to-do list." : "We won't suggest this again."
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
                {analysis.source === 'screenshot' ? 'Screenshot Analysis' : 'Manual Entry'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(analysis.createdAt).toLocaleDateString(undefined, { 
                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' 
                })}
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Post Breakdown</h1>
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
            {/* The Take */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">The Brutally Honest Take</h2>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
                <p className="text-lg leading-relaxed text-foreground font-medium">
                  {analysis.brutallyHonestTake}
                </p>
                <div className="mt-6 pt-6 border-t border-primary/10">
                  <p className="text-muted-foreground leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
              </div>
            </section>

            {/* Why it Happened */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                  <Target className="w-4 h-4" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Why It Happened</h2>
              </div>
              <div className="grid gap-3">
                {analysis.whyItHappened.map((reason, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm hover-elevate">
                    <div className="mt-0.5 min-w-6 text-muted-foreground font-mono text-sm">{i + 1}.</div>
                    <p className="text-foreground">{reason}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Next Actions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Your Playbook</h2>
                </div>
              </div>
              <div className="space-y-4">
                {analysis.suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className={`overflow-hidden transition-all duration-300 ${suggestion.status === 'accepted' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : suggestion.status === 'rejected' ? 'opacity-50 grayscale border-border/50' : 'border-primary/20 shadow-md'}`}>
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{suggestion.title}</CardTitle>
                          <CardDescription className="text-sm font-medium">{suggestion.rationale}</CardDescription>
                        </div>
                        {suggestion.status !== 'pending' && (
                          <Badge variant="outline" className={suggestion.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}>
                            {suggestion.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 bg-background rounded-lg p-3 border border-border">
                          <span className="text-xs uppercase font-bold text-muted-foreground block mb-1 tracking-wider">The Action</span>
                          <span className="font-medium text-foreground">{suggestion.action}</span>
                        </div>
                        
                        {suggestion.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <Button 
                              variant="outline" 
                              className="w-12 h-12 p-0 rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30"
                              onClick={() => handleFeedback(suggestion.id, "rejected")}
                              disabled={submitFeedback.isPending}
                            >
                              <X className="w-5 h-5" />
                            </Button>
                            <Button 
                              className="w-12 h-12 p-0 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-sm"
                              onClick={() => handleFeedback(suggestion.id, "accepted")}
                              disabled={submitFeedback.isPending}
                            >
                              {submitFeedback.isPending && submitFeedback.variables?.data?.suggestionId === suggestion.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Check className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {/* Detailed Stats */}
            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg">Detailed Metrics</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <dl className="space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <dt className="text-muted-foreground">Format</dt>
                    <dd className="font-semibold capitalize">{metrics.contentFormat.replace('_', ' ')}</dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <dt className="text-muted-foreground">Follower Change</dt>
                    <dd className={`font-semibold ${metrics.followerChange > 0 ? 'text-green-500' : metrics.followerChange < 0 ? 'text-red-500' : ''}`}>
                      {metrics.followerChange > 0 ? '+' : ''}{metrics.followerChange}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <dt className="text-muted-foreground">Saves</dt>
                    <dd className="font-semibold">{metrics.saves.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <dt className="text-muted-foreground">Shares</dt>
                    <dd className="font-semibold">{metrics.shares.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <dt className="text-muted-foreground">Profile Visits</dt>
                    <dd className="font-semibold">{metrics.profileVisits.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <dt className="text-muted-foreground">Link Clicks</dt>
                    <dd className="font-semibold">{metrics.linkClicks.toLocaleString()}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Content Plan Ideas */}
            {analysis.nextContentPlan && analysis.nextContentPlan.length > 0 && (
              <Card className="bg-card border-secondary border-2">
                <CardHeader className="pb-3 border-b border-border/50 bg-secondary/10">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-secondary-foreground" />
                    Content Ideas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    {analysis.nextContentPlan.map((plan, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm">
                        <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-foreground leading-tight">{plan}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Questions */}
            {analysis.clarifyingQuestions && analysis.clarifyingQuestions.length > 0 && (
              <Card className="bg-muted/30 border-dashed border-border">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                    <HelpCircle className="w-4 h-4" />
                    Think about this...
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-4">
                    {analysis.clarifyingQuestions.map((q, i) => (
                      <li key={i} className="text-sm text-muted-foreground font-medium italic">
                        "{q}"
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
