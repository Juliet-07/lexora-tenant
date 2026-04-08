
# Corporate Tenant Platform — UI Prototype

## Design System
- **Primary**: Royal Blue (`#4338CA`) and Purple (`#7C3AED`) gradient accents
- **Dark sidebar** with purple/blue gradient header
- **Clean white content area** with subtle card shadows
- **Font**: System default (Inter-style)

## Layout
- **Sidebar navigation** (collapsible) with icons for all modules
- **Top header bar** with search, notifications bell, and user avatar
- **Breadcrumb navigation** in content area

---

## Pages & Features

### 1. Dashboard (`/`)
- Welcome banner with user name and date
- **Stat cards**: Active Clients, Pending Approvals, Open Projects, Revenue (this month)
- **Tasks widget**: overdue/upcoming tasks list
- **Compliance alerts**: flagged items needing attention
- **Revenue chart**: bar chart (last 6 months)
- **Recent activity** feed

### 2. Clients (`/clients`)
- **Client list** with search, filters (type, risk level, status), and sort
- Table view: Name, Type (Individual/Corporate), Risk Level (color-coded badge), Status, Date Added
- "Add Client" button → triggers onboarding flow

### 3. Client Onboarding Flow (`/clients/new`) — Multi-Step Wizard
- **Step 1**: Select Client Type (Individual / Corporate) — card selection
- **Step 2**: Intake Form — personal/company details, contact info
- **Step 3**: Document Upload — drag & drop area for ID, incorporation docs, etc.
- **Step 4**: AML/KYC Check (mock) — animated progress → displays mock results: Identity ✓, PEP Screening ✓, Sanctions ✓, Risk Score (Low/Medium/High)
- **Step 5**: Approval — if High risk, shows EDD required banner; assign compliance officer; Approve/Reject buttons
- **Step 6**: Confirmation — success screen with next steps

### 4. Client Profile (`/clients/:id`)
- **Header**: client name, type badge, risk badge, status
- **Tabs**: Overview | Documents | Projects | Compliance | Billing | Communications
- Overview: key details, engagement letter status, assigned team
- Documents: uploaded files list
- Compliance: KYC history, risk assessment timeline
- Billing: invoices list
- Communications: message thread (mock)

### 5. Projects (`/projects`)
- Project cards/table: name, linked client, status, progress bar, deadline
- "New Project" button
- **Project detail page** (`/projects/:id`): tasks list, milestones timeline, team assignments, hours tracking

### 6. Team / Resources (`/team`)
- Team members list with roles, workload bars, assigned projects
- Resource allocation overview

### 7. Billing (`/billing`)
- Invoice list: client, amount, status (paid/pending/overdue), date
- "Create Invoice" button → form with fixed/hourly/milestone options
- Invoice detail/preview

### 8. Compliance (`/compliance`)
- Pending reviews list
- Risk distribution chart (pie chart: Low/Medium/High)
- Recent flags & alerts
- Periodic review schedule

### 9. Reports (`/reports`)
- Report type selector: Compliance, Risk, Financial
- Date range picker
- Mock report preview with charts and tables
- Export button (mock)

---

## Data
All screens use **realistic mock data** (fake client names, amounts, dates). No backend — everything is in-memory/static. Designed so Supabase can be wired in later.

## Navigation Sidebar Items
Dashboard | Clients | Projects | Team | Billing | Compliance | Reports | Settings (placeholder)
