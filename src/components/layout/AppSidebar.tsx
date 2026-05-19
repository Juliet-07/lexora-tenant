import {
  LayoutDashboard,
  Users,
  FolderKanban,
  UserCog,
  Receipt,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  ClipboardCheck,
  ScanSearch,
  FileWarning,
  Activity,
  BookOpen,
  ListChecks,
  AlertTriangle,
  FileText,
  ShieldAlert,
  CalendarDays,
  Wallet,
  GraduationCap,
  Briefcase,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";

// Nav items keyed by backend module id
const NAV_BY_MODULE: Record<
  string,
  {
    title: string;
    url: string;
    icon: any;
    adminOnly?: boolean;
  }[]
> = {
  "kyc/aml": [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    {
      title: "Onboarding & CDD",
      url: "/clients/onboarding",
      icon: ClipboardCheck,
      adminOnly: true,
    },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
    // {
    //   title: "Screening",
    //   url: "/aml/screening",
    //   icon: ScanSearch,
    //   adminOnly: true,
    // },
    {
      title: "Risk Engine",
      url: "/aml/risk",
      icon: ShieldAlert,
      adminOnly: true,
    },
    {
      title: "Transaction Monitoring",
      url: "/aml/transactions",
      icon: Activity,
      adminOnly: true,
    },
    { title: "SAR / STR", url: "/aml/sar", icon: FileWarning, adminOnly: true },
    {
      title: "Watchlist Management",
      url: "/aml/watchlist",
      icon: ScanSearch,
      adminOnly: true,
    },
    {
      title: "Compliance Alerts",
      url: "/compliance",
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      title: "Regulatory Reports",
      url: "/reports",
      icon: BarChart3,
      adminOnly: true,
    },
  ],
  grc: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
    {
      title: "Risk Register",
      url: "/grc/risks",
      icon: AlertTriangle,
      adminOnly: true,
    },
    {
      title: "Controls Library",
      url: "/grc/controls",
      icon: ListChecks,
      adminOnly: true,
    },
    {
      title: "Policies",
      url: "/grc/policies",
      icon: BookOpen,
      adminOnly: true,
    },
    {
      title: "Incidents",
      url: "/grc/incidents",
      icon: FileWarning,
      adminOnly: true,
    },
    {
      title: "Audit Support",
      url: "/grc/audits",
      icon: FileText,
      adminOnly: true,
    },
    {
      title: "Third-Party Risk",
      url: "/grc/vendors",
      icon: Briefcase,
      adminOnly: true,
    },
    { title: "BCP / DR", url: "/grc/bcp", icon: ShieldAlert, adminOnly: true },
  ],
  crm: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Team", url: "/team", icon: UserCog, adminOnly: true },
    { title: "Billing", url: "/billing", icon: Receipt },
    { title: "Reports", url: "/reports", icon: BarChart3, adminOnly: true },
  ],
  hr: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
    { title: "Employees", url: "/hr/employees", icon: Users, adminOnly: true },
    {
      title: "Recruitment",
      url: "/hr/recruitment",
      icon: ClipboardList,
      adminOnly: true,
    },
    { title: "Time & Attendance", url: "/hr/attendance", icon: CalendarDays },
    { title: "Leave", url: "/hr/leave", icon: CalendarDays },
    {
      title: "Performance",
      url: "/hr/performance",
      icon: BarChart3,
      adminOnly: true,
    },
    { title: "Payroll", url: "/hr/payroll", icon: Wallet, adminOnly: true },
    { title: "Learning & Dev", url: "/hr/learning", icon: GraduationCap },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, logout } = useAuth();
  const { currentModule, isLoadingDashboard } = useModule();
  const Icon = currentModule.icon;

  const navItems = (
    NAV_BY_MODULE[currentModule.id] ?? [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ]
  ).filter((n) => !n.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      {/* Brand */}
      <div className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${currentModule.color} flex items-center justify-center`}
            >
              {isLoadingDashboard ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Icon className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight truncate">
                Lexora
              </h1>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                {currentModule.shortName}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${currentModule.color} flex items-center justify-center mx-auto`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel>{currentModule.shortName}</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title + item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="hover:bg-sidebar-accent/50 text-sidebar-foreground cursor-pointer"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
