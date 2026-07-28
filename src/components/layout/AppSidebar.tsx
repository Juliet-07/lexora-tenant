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
  Clock,
  TrendingUp,
  Contact,
  UsersRound,
  FileSignature,
  FolderOpen,
  Globe,
  Gavel,
  ChevronDown,
  Landmark,
  Cog,
  Handshake,
  Scale,
  FileStack,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";

// ─────────────────────────────────────────────────────────────
// Nav items keyed by backend module id.
//
// IMPORTANT: keys here must exactly match what the backend returns
// in TenantSubscription.activeModules (PlatformModuleKey enum values).
//
// Backend enum → key used here:
//   kyc_aml   → "kyc_aml"   (was "kyc/aml" — mismatch fixed)
//   grc       → "grc"
//   crm       → "crm"
//   hr_pm     → "hr_pm"     (was "hr" — mismatch fixed)
// ─────────────────────────────────────────────────────────────

type NavChild = { title: string; url: string; adminOnly?: boolean };
type NavItem = {
  title: string;
  url?: string;
  icon: any;
  adminOnly?: boolean;
  children?: NavChild[];
};

const NAV_BY_MODULE: Record<string, NavItem[]> = {
  // ── AML / KYC ──────────────────────────────────────────────
  kyc_aml: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    {
      title: "Onboarding & CDD",
      url: "/clients/onboarding",
      icon: ClipboardCheck,
      adminOnly: true,
    },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
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
    {
      title: "SAR / STR",
      url: "/aml/sar",
      icon: FileWarning,
      adminOnly: true,
    },
    {
      title: "Watchlist Management",
      url: "/aml/watchlist",
      icon: ScanSearch,
      adminOnly: true,
    },
    {
      title: "Compliance Alerts",
      url: "/aml/compliance",
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      title: "Reporting & Analytics",
      url: "/aml/reports",
      icon: BarChart3,
      adminOnly: true,
    },
  ],

  // ── GRC ────────────────────────────────────────────────────
  grc: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    {
      title: "GRC Overview",
      url: "/grc/overview",
      icon: BarChart3,
      adminOnly: true,
    },
    {
      title: "Compliance",
      icon: ShieldCheck,
      adminOnly: true,
      children: [
        { title: "Regulatory Obligations", url: "/grc/compliance/obligations" },
        { title: "Compliance Calendar", url: "/grc/compliance/calendar" },
        { title: "Certifications", url: "/grc/compliance/certifications" },
        { title: "Policies", url: "/grc/compliance/policies" },
        { title: "Audit Management", url: "/grc/compliance/audits" },
        {
          title: "Regulatory Change",
          url: "/grc/compliance/regulatory-change",
        },
      ],
    },
    {
      title: "Governance",
      icon: Landmark,
      adminOnly: true,
      children: [
        { title: "Board Management", url: "/grc/governance/board" },
        { title: "Committees", url: "/grc/governance/committees" },
        { title: "Meetings", url: "/grc/governance/meetings" },
        { title: "Governance Codes", url: "/grc/governance/codes" },
        { title: "Resolutions", url: "/grc/governance/resolutions" },
      ],
    },
    {
      title: "Deals & Transactions",
      icon: Handshake,
      adminOnly: true,
      children: [
        { title: "Deal Pipeline", url: "/grc/deals/pipeline" },
        { title: "Clause Library", url: "/grc/deals/clauses" },
        { title: "Precedent Templates", url: "/grc/deals/precedents" },
        { title: "Legal Knowledge Base", url: "/grc/deals/legal" },
      ],
    },
    {
      title: "Deal Intelligence",
      icon: BarChart3,
      adminOnly: true,
      children: [
        { title: "Investor Readiness", url: "/grc/intelligence/investor-readiness" },
        { title: "Company Valuation", url: "/grc/intelligence/valuation" },
        { title: "Portfolio Analysis", url: "/grc/intelligence/portfolio" },
      ],
    },

    {
      title: "Risk",
      icon: AlertTriangle,
      adminOnly: true,
      children: [
        { title: "Risk Register", url: "/grc/risk/register" },
        { title: "Risk Appetite", url: "/grc/risk/appetite" },
        { title: "Control Library", url: "/grc/risk/controls" },
        { title: "Treatment Plans", url: "/grc/risk/treatment" },
        { title: "Incidents", url: "/grc/risk/incidents" },
        {
          title: "Third-Party",
          url: "/grc/risk/vendors",
        },
        { title: "BCP / DR", url: "/grc/risk/bcp" },
      ],
    },
    {
      title: "Report",
      url: "/grc/reporting",
      icon: BarChart3,
      adminOnly: true,
    },
  ],

  // ── CRM & Project Management ──────────────────────────────
  crm: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    {
      title: "Pipeline",
      url: "/crm/pipeline",
      icon: TrendingUp,
      adminOnly: true,
    },
    // { title: "Contacts & Accounts", url: "/crm/contacts", icon: Contact, adminOnly: true },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
    { title: "Projects", url: "/crm/projects", icon: FolderKanban },
    { title: "Time Tracking", url: "/crm/time", icon: Clock },
    {
      title: "Resources",
      url: "/crm/resources",
      icon: UsersRound,
      adminOnly: true,
    },
    {
      title: "Invoicing",
      url: "/crm/invoicing",
      icon: Receipt,
      adminOnly: true,
    },
    {
      title: "Contracts & Docs",
      url: "/crm/contracts",
      icon: FileSignature,
      adminOnly: true,
    },
    // { title: "Client Portal", url: "/crm/portal", icon: Globe, adminOnly: true },
  ],

  // ── HR & People Management ─────────────────────────────────
  hr_pm: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    {
      title: "HR Overview",
      url: "/hr/overview",
      icon: BarChart3,
      adminOnly: true,
    },
    { title: "Clients", url: "/clients", icon: Users, adminOnly: true },
    {
      title: "Employees",
      url: "/hr/employees",
      icon: Users,
      adminOnly: true,
    },
    {
      title: "Probation",
      url: "/hr/probation",
      icon: ClipboardCheck,
      adminOnly: true,
    },
    {
      title: "Recruitment",
      url: "/hr/recruitment",
      icon: ClipboardList,
      adminOnly: true,
    },
    {
      title: "Contracts",
      url: "/hr/contracts",
      icon: FileText,
      adminOnly: true,
    },
    {
      title: "Time & Attendance",
      url: "/hr/attendance",
      icon: CalendarDays,
    },
    { title: "Leave", url: "/hr/leave", icon: CalendarDays },
    {
      title: "Performance",
      url: "/hr/performance",
      icon: BarChart3,
      adminOnly: true,
    },
    {
      title: "Payroll",
      url: "/hr/payroll",
      icon: Wallet,
      adminOnly: true,
    },
    {
      title: "Learning & Dev",
      url: "/hr/learning",
      icon: GraduationCap,
    },
    {
      title: "Disputes",
      url: "/hr/disputes",
      icon: ShieldAlert,
      adminOnly: true,
    },
    {
      title: "Requisitions",
      url: "/hr/requisitions",
      icon: ClipboardList,
      adminOnly: true,
    },
    {
      title: "Reports",
      url: "/hr/reports",
      icon: BarChart3,
      adminOnly: true,
    },
  ],

  // ── Legacy key aliases — kept so any old data still resolves ──
  // If the DB ever returns "kyc/aml" or "hr" these still work.
  "kyc/aml": [], // populated below after definition
  hr: [], // populated below after definition
};

// Point legacy keys at the same arrays (no duplication)
NAV_BY_MODULE["kyc/aml"] = NAV_BY_MODULE["kyc_aml"];
NAV_BY_MODULE["hr"] = NAV_BY_MODULE["hr_pm"];

export function AppSidebar() {
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const collapsed = state === "collapsed";
  const { isAdmin, logout, user } = useAuth();
  const { currentModule, isLoadingDashboard } = useModule();

  // ── Team members get a fixed, minimal sidebar — no module switching,
  //    no HR/admin areas. Just their workspace essentials.
  const TEAM_MEMBER_NAV = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Profile", url: "/my/profile", icon: UserCog },
    {
      title: "My Team",
      url: "/my/team",
      icon: UsersRound,
      requiresRole: "manager",
    },
    { title: "Clients", url: "/clients", icon: Users },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Time", url: "/my/time", icon: Clock },
    { title: "Leave", url: "/my/leave", icon: CalendarDays },
    { title: "Performance", url: "/my/performance", icon: BarChart3 },
    { title: "Payslips", url: "/my/payslips", icon: Wallet },
    { title: "Requisitions", url: "/my/requisitions", icon: ClipboardList },
    { title: "Learning", url: "/my/learning", icon: GraduationCap },
    { title: "Disputes", url: "/my/disputes", icon: ShieldAlert },
    {
      title: "Team Disputes",
      url: "/my/team-disputes",
      icon: Gavel,
      requiresRole: "manager",
    },
    {
      title: "My Department",
      url: "/my/department",
      icon: UsersRound,
      requiresRole: "head_of_department",
    },
  ];

  if (!isAdmin) {
    return (
      <Sidebar collapsible="icon">
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight truncate">
                  Lexora
                </h1>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">
                  Workspace
                </p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <SidebarContent className="pt-2">
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {TEAM_MEMBER_NAV.filter(
                  (item) =>
                    !item.requiresRole ||
                    item.requiresRole === user?.hierarchyRole,
                ).map((item) => (
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

  if (!currentModule) {
    return (
      <Sidebar collapsible="icon">
        <div className="p-4 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-muted animate-pulse mx-auto" />
        </div>
        <SidebarContent className="pt-2" />
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
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
              {navItems.map((item) => {
                if (item.children && item.children.length > 0) {
                  const kids = item.children.filter(
                    (c) => !c.adminOnly || isAdmin,
                  );
                  const isBranchActive = kids.some((c) =>
                    pathname.startsWith(c.url),
                  );
                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isBranchActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="hover:bg-sidebar-accent/50 text-sidebar-foreground">
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left">
                                  {item.title}
                                </span>
                                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {!collapsed && (
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {kids.map((c) => (
                                <SidebarMenuSubItem key={c.url}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={c.url}
                                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                    >
                                      <span>{c.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                return (
                  <SidebarMenuItem key={item.title + item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url!}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
