import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, LineChart, UserCircle } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Analyze Post", href: "/analyze", icon: LineChart },
    { name: "Profile", href: "/onboarding", icon: UserCircle },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background font-sans text-foreground">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4">
            <Link href="/app" className="flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                IQ
              </div>
              <span className="font-bold text-lg tracking-tight">CreatorIQ</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-2 pt-4">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    className="font-medium"
                  >
                    <Link href={item.href} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-border">
            <div className="flex items-center gap-3 px-2">
              <img
                src="https://api.dicebear.com/7.x/initials/svg?seed=Demo"
                alt="Profile"
                className="w-10 h-10 rounded-full border border-border"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate">Demo User</span>
                <span className="text-xs text-muted-foreground truncate">Prototype mode</span>
              </div>
            </div>
          </div>
          <SidebarRail />
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
