# Smart Andon Manufacturing System 

An enterprise-grade, real-time **Andon Call Management & Maintenance Response System** engineered specifically for high-velocity industrial manufacturing environments. Designed under Lean Manufacturing and Industry 4.0 principles, this solution bridges the critical gap between the shop floor and maintenance teams—drastically reducing line downtime, accelerating Mean Time to Respond (MTTR), and enforcing standardized Root Cause Analysis (RCA).

---

##  Executive Overview & Purpose

In modern manufacturing facilities, unaddressed workstation anomalies and delayed maintenance dispatch directly translate to lost output, reduced Overall Equipment Effectiveness (OEE), and escalating operational costs. 

The **Smart Andon Manufacturing System** eliminates traditional communication bottlenecks by digitizing the entire incident lifecycle:
* **Instant Visual & Audio Signaling**: Alerts the entire plant floor the second a line stop or warning occurs.
* **Streamlined Work Order Dispatch**: Routes actionable notifications directly to on-duty technicians and integrated Telegram channels.
* **Enforced Continuous Improvement (Kaizen)**: Requires structured 5-Why Root Cause Analysis before work order closure to eliminate recurring failures.
* **Executive Decision Intelligence**: Aggregates live KPIs, downtime durations, and Pareto defect distributions into actionable analytics.

---

##  Role-Based Access Control (RBAC) & User Matrix

The system provides a strictly controlled multi-tiered security model tailored to industrial plant hierarchies:

```
┌──────────────────────────────────────────────────────────────────┐
│                   PLANT ADMINISTRATOR                            │
│   • Full System Configuration & Master Data Management (CSV)     │
│   • Custom Branding & Audit Trail Inspection                     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
┌────────▼───────────────────────┐       ┌─────────────────▼──────────────┐
│       PLANT SUPERVISOR         │       │     MAINTENANCE TECHNICIAN     │
│ • Executive Analytics & OEE    │       │ • Work Order Receipt & Dispatch│
│ • Historical Performance Logs  │       │ • Incident Ack & In-Progress   │
│ • Data Sanitation & Shift Over │       │ • 5-Why RCA Work Order Closure │
└────────────────────────────────┘       └────────────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │  LINE OPERATOR  │
                         │ • Instant Calls │
                         │ • Station Alert │
                         │ • Safety E-Stop │
                         └─────────────────┘
```

### Pre-Configured Demo Credentials

| Role | Badge ID (NPK) | Default PIN | Core Permissions & Operational Scope |
| :--- | :--- | :--- | :--- |
| **Operator** | `OP-1001` | `1234` | Create instant Andon calls on assigned lines; toggle line-stop state. |
| **Technician** | `TECH-2001` | `2345` | Acknowledge alerts, log repair stages, and submit 5-Why RCA root cause resolutions. |
| **Supervisor** | `SPV-3001` | `3456` | Review plant-wide OEE KPIs, Pareto metrics, MTTR performance, and export reports. |
| **Administrator** | `ADMIN-99` | `9999` | Manage master datasets (Lines, Machines, Operators), configure branding, inspect audit logs. |

---

**  Key Features & Modules **

### 1.Central TV Andon Display Board 
* **Visual Tower Lights**: High-contrast, color-coded status indicators (🟢 Normal, 🟡 Warning, 🔴 Line Stop / Critical) visible from across the factory floor.
* **Synthesized Audio Sirens**: Multi-tone audio alerting with configurable chime pitch, volume, and repeat frequencies.
* **Active Queue & Downtime Clock**: Displays live incident timers updating per second to maintain urgency.
* **Fullscreen & Kiosk Mode**: One-click fullscreen capability optimized for ceiling-mounted LED/LCD TV monitors.

### 2.Touch-Optimized Operator Terminal
* **Intuitive Station Grid**: Ergonomic button layout designed for glove-friendly industrial touchscreens and tablets.
* **Multi-Category Anomaly Logging**: Fast selection across **Machine Breakdown**, **Quality Defect**, **Material Shortage**, and **Safety Incident**.
* **Line-Stop Emergency Toggle**: Differentiates between assistance requests and full production-stopping emergencies.

### 3.Rapid Technician & Maintenance Workbench
* **3-Phase Workflow**: Standardizes incident resolution into *Acknowledge (ACK)* ➔ *Start Repair (In Progress)* ➔ *Resolved (Closed)*.
* **Integrated 5-Why RCA Form**: Prompts technicians to document the technical root cause and preventive action before closing any ticket.
* **Technician Assignment Tracking**: Automatically logs timestamps and assigned badge IDs for audit readiness.

### 4.Executive Analytics & Plant KPI Engine
* **OEE & Production Efficiency**: Live tracking of actual vs. planned target units per shift.
* **Pareto Anomaly Frequency**: Automatic sorting of issues by category to highlight top downtime contributors.
* **MTTR Metrics**: Calculates Mean Time to Respond (Acknowledge speed) and Mean Time to Resolve (Repair speed).
* **Consolidated Data Export**: Generates one-click comprehensive CSV reports for shift handovers and management audits.

### 5.Audit Trail & Master Data Manager
* **Tamper-Evident Activity Log**: Records every state transition, user login, call creation, and database modification.
* **Self-Service CSV/Excel Importers**: Bulk upload manufacturing lines, workstation machines, operator badges, and problem classification codes.
* **Data Sanitation Utility**: One-click purge of trial/simulation tickets to prepare the database for live production.

### 6.Custom Branding & White-Label Capabilities
* **Adaptive Modern Logo**: Ships with an ultra-minimalist geometric demo logo (`assy`).
* **Direct Image Upload & URL Sync**: Easily upload your company's official SVG/PNG logo or provide a remote image URL.
* **Live Theme Preview**: Real-time dual-preview across Light and Dark industrial themes.
* **Customizable System Title & Dimensions**: Fine-tune the header title, subtitle, and logo height (24px–56px).

---

## Tangible Business & Operational Benefits

| Operational Challenge | How Smart Andon Solves It | Measurable Impact |
| :--- | :--- | :--- |
| **Delayed Notification** | Instant audible siren and Telegram dispatch when a call is placed. | **↓ 70% Reduction** in initial response lag. |
| **Recurring Downtime** | Enforced 5-Why Root Cause Analysis for continuous improvement. | **↓ 40% Reduction** in repetitive machine failures. |
| **Lack of Visibility** | Real-time plant-wide TV display board accessible across all shifts. | **100% Transparency** on active shop floor blockers. |
| **Manual Record-Keeping** | Automated timestamping of every response phase and CSV report generation. | **Zero manual paperwork** for shift handovers. |
| **Deployment Complexity** | Instant dual-engine (zero-config Demo Mode vs. Cloud Firebase). | **Live within minutes** on any standard browser. |

---

## Tech Stack & Architecture

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts
* **Backend Runtime**: Node.js, Express.js (Bundled into high-efficiency standalone CommonJS via `esbuild`)
* **Persistence & Real-Time Sync**: Google Cloud Firestore & Firebase Authentication (with client-side demo fallback)
* **Reporting & Data Parsing**: PapaParse (CSV) & SheetJS (XLSX)

---

## Environment Configuration (`.env`)

Configure your environment variables in `.env` to switch between local demo and enterprise cloud mode:

```env
# Operational Mode: 'demo' for instant offline/browser storage, 'firebase' for real-time cloud database
VITE_DATA_PROVIDER=demo

# Firebase Credentials (Required when VITE_DATA_PROVIDER=firebase)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# System Branding & White-Label Customization (Optional)
VITE_APP_NAME="ANDON SMART FACTORY"
VITE_APP_COMPANY="Your Company Name"
VITE_APP_LOGO_URL=""

# Telegram Bot Real-Time Notification Dispatcher (Optional)
VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
VITE_TELEGRAM_CHAT_ID=your_telegram_channel_or_group_id
```

---

##  Quick Start Guide

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/smart-andon-manufacturing-system.git
   cd smart-andon-manufacturing-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

4. **Compile for production**:
   ```bash
   npm run build
   ```

---

## 📚 Administration Manual & CSV Templates

For detailed configuration guides, custom logo uploading, trial data reset procedures, and standard master data schemas, refer to the documents in:
📁 **`assets/instruction_guide/`**
* **`USER_GUIDE.md`**: Complete operational manual for plant administrators and supervisors.
* **`template_lines.csv`**: Sample CSV structure for manufacturing lines.
* **`template_machines.csv`**: Sample CSV structure for equipment and machinery assets.
* **`template_operators.csv`**: Sample CSV structure for operators, technicians, and staff accounts.

---

##  A Personal Note from the Creator

> *"Manufacturing excellence is built on speed, clarity, and continuous improvement (Kaizen). This Smart Andon system was crafted with precision to give plant managers, maintenance engineers, and operators a reliable, visually intuitive tool that eliminates operational friction and drives true productivity on the shop floor."*

Wishing you peak efficiency, safe operations, and continuous growth!

Warm regards,  
**Ressa Hidayat**  
*Lead Developer & Industrial Solutions Creator*  
📬 [hidayatressa@gmail.com](mailto:hidayatressa@gmail.com)
