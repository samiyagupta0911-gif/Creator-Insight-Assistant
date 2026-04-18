import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Analyze from "@/pages/analyze";
import AnalysisDetail from "@/pages/analysis";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/app" component={Dashboard} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/analyze" component={Analyze} />
            <Route path="/analysis/:id">
              {(params) => <AnalysisDetail id={params.id} />}
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}
