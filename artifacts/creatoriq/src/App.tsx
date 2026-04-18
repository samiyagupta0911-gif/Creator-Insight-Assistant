import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut, useClerk } from "@clerk/clerk-react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Analyze from "@/pages/analyze";
import AnalysisDetail from "@/pages/analysis";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(15, 90%, 55%)",
    colorBackground: "hsl(40, 33%, 98%)",
    colorInputBackground: "hsl(30, 20%, 95%)",
    colorText: "hsl(24, 10%, 10%)",
    colorTextSecondary: "hsl(24, 10%, 40%)",
    colorInputText: "hsl(24, 10%, 10%)",
    colorNeutral: "hsl(24, 10%, 40%)",
    borderRadius: "0.75rem",
    fontFamily: "'Inter', sans-serif",
    fontFamilyButtons: "'Inter', sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "rounded-2xl w-full overflow-hidden shadow-lg border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: { color: "hsl(24, 10%, 10%)" },
    headerSubtitle: { color: "hsl(24, 10%, 40%)" },
    socialButtonsBlockButtonText: { color: "hsl(24, 10%, 10%)" },
    formFieldLabel: { color: "hsl(24, 10%, 10%)" },
    footerActionLink: { color: "hsl(15, 90%, 55%)" },
    footerActionText: { color: "hsl(24, 10%, 40%)" },
    dividerText: { color: "hsl(24, 10%, 40%)" },
    identityPreviewEditButton: { color: "hsl(15, 90%, 55%)" },
    formFieldSuccessText: { color: "hsl(15, 90%, 55%)" },
    alertText: { color: "hsl(0, 84%, 60%)" },
    logoBox: "flex justify-center mb-4",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-border hover:bg-black/5 transition-colors",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground transition-colors",
    formFieldInput: "bg-transparent border-input focus:ring-ring",
    footerAction: "bg-transparent",
    dividerLine: "bg-border",
  },
};

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <SignedIn>
        <Redirect to="/app" />
      </SignedIn>
      <SignedOut>
        <Home />
      </SignedOut>
    </>
  );
}

function AppPortal() {
  return (
    <>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <Redirect to="/" />
      </SignedOut>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Welcome back, creator",
            subtitle: "Sign in to access your analytics insights",
          },
        },
        signUp: {
          start: {
            title: "Join CreatorIQ",
            subtitle: "Your personal strategist is ready",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/app" component={AppPortal} />
            <Route path="/onboarding">
              <>
                <SignedIn>
                  <Onboarding />
                </SignedIn>
                <SignedOut>
                  <Redirect to="/" />
                </SignedOut>
              </>
            </Route>
            <Route path="/analyze">
              <>
                <SignedIn>
                  <Analyze />
                </SignedIn>
                <SignedOut>
                  <Redirect to="/" />
                </SignedOut>
              </>
            </Route>
            <Route path="/analysis/:id">
              {(params) => (
                <>
                  <SignedIn>
                    <AnalysisDetail id={params.id} />
                  </SignedIn>
                  <SignedOut>
                    <Redirect to="/" />
                  </SignedOut>
                </>
              )}
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
