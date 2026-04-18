import { AppLayout } from "@/components/layout";
import { useGetCreatorDashboard, getGetCreatorDashboardQueryKey, useListCreatorMatches, getListCreatorMatchesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ArrowRight, AlertCircle, TrendingUp, CheckCircle2, XCircle, Users, Activity, LineChart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading: isLoadingDashboard, error: dashboardError } = useGetCreatorDashboard({
    query: {
      queryKey: getGetCreatorDashboardQueryKey()
    }
  });

  const { data: matches, isLoading: isLoadingMatches } = useListCreatorMatches({
    query: {
      queryKey: getListCreatorMatchesQueryKey()
    }
  });

  if (isLoadingDashboard) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (dashboardError) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard. Please try again.</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (dashboard && !dashboard.profileComplete) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
            <Activity className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Let's calibrate your strategist</h1>
          <p className="text-muted-foreground text-lg">
            Before we can analyze your performance, we need to know what normal looks like for you.
          </p>
          <Button size="lg" className="w-full text-lg h-12" onClick={() => setLocation("/onboarding")}>
            Set up Creator Profile <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Here is how you are tracking this week.</p>
          </div>
          <Button onClick={() => setLocation("/analyze")} className="font-semibold shadow-sm hover-elevate">
            Analyze New Post <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analyses Run</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.analysesCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="hover-elevate transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(dashboard?.averageEngagementRate || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="hover-elevate transition-shadow border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted Actions</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.acceptedSuggestions || 0}</div>
            </CardContent>
          </Card>
          <Card className="hover-elevate transition-shadow border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected Actions</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.rejectedSuggestions || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-7">
          {/* Latest Analysis */}
          <Card className="md:col-span-2 lg:col-span-4 flex flex-col">
            <CardHeader>
              <CardTitle>Latest Insight</CardTitle>
              <CardDescription>Your most recently analyzed post.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {dashboard?.latestAnalysis ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  <div className="bg-secondary/30 p-4 rounded-xl border border-secondary">
                    <h4 className="font-bold text-lg mb-2">Brutally Honest Take</h4>
                    <p className="text-secondary-foreground leading-relaxed">
                      {dashboard.latestAnalysis.brutallyHonestTake}
                    </p>
                  </div>
                  <div className="mt-auto pt-4 flex gap-3">
                    <Button variant="default" className="w-full" onClick={() => setLocation(`/analysis/${dashboard.latestAnalysis?.id}`)}>
                      View Full Breakdown
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-xl border border-dashed border-border">
                  <LineChart className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium">No analyses yet.</p>
                  <Button variant="link" onClick={() => setLocation("/analyze")} className="mt-2 text-primary">
                    Run your first analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Matches */}
          <Card className="md:col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Who to Watch
              </CardTitle>
              <CardDescription>Accounts crushing it in your niche.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMatches ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : matches && matches.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.id} className="p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-foreground">@{match.handle}</span>
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">{match.followerTier}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{match.whyMatch}</p>
                      <div className="bg-background rounded-lg p-3 text-sm border border-border shadow-sm">
                        <span className="font-semibold block mb-1">Study this:</span>
                        <span className="text-foreground">{match.tacticToStudy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 bg-muted/20 rounded-xl border border-dashed border-border">
                  <p className="text-muted-foreground">Upload more data to get tailored creator matches.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
