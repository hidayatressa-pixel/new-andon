# Smart Andon System — Operational & Administration Guide 📘

Welcome to the **Smart Andon Manufacturing System** operational guide. This comprehensive reference document provides plant administrators, maintenance engineers, and IT coordinators with technical instructions on system configuration, custom branding, master data imports, data sanitation, and deployment best practices.

---

## Table of Contents
1. [Custom Branding & Logo Configuration](#1-custom-branding--logo-configuration)
2. [Master Data Management & CSV/Excel Upload](#2-master-data-management--csvexcel-upload)
3. [CSV Template Specifications & Data Schemas](#3-csv-template-specifications--data-schemas)
4. [Trial / Demo Data Reset & Factory Clean Slate](#4-trial--demo-data-reset--factory-clean-slate)
5. [Operational Modes (Demo Mode vs. Cloud Firebase)](#5-operational-modes-demo-mode-vs-cloud-firebase)
6. [Incident Handling Lifecycle & 5-Why RCA](#6-incident-handling-lifecycle--5-why-rca)
7. [Telegram Bot Notification Integration](#7-telegram-bot-notification-integration)
8. [Hardware Recommendations & TV Kiosk Mode Setup](#8-hardware-recommendations--tv-kiosk-mode-setup)

---

## 1. Custom Branding & Logo Configuration

The system is equipped with **White-Label & Custom Branding** capabilities. Plants can either retain the default minimalist geometric demo logo (`assy`) or replace it with their official corporate logo and identity.

### Methods to Customize Branding

#### Method A: Direct In-App Upload (Instant & Persistent)
1. Log in with an **Administrator** account (`ADMIN-99` / PIN `9999`) or **Supervisor** account.
2. Open **Settings** (Gear icon ⚙️ in the top header) OR navigate to the **Master Data** tab ➔ sub-tab **"Logo & Branding"**.
3. Under **Logo Mode**, choose between:
   * **Default Demo Logo**: Minimalist geometric vector.
   * **Upload / Custom Image**: Click **"Choose Logo Image File..."** to select a file from your computer (supported formats: `PNG`, `SVG`, `JPG`, `WebP`, max 2MB) OR paste a direct image URL.
   * **Brand Name (Text)**: Input an acronym or company name badge (e.g., `PT INDO TECH`).
4. Customize the **Header System Title** (e.g., `ANDON SMART FACTORY`) and adjust the **Logo Height Slider** (24px to 56px).
5. Inspect the **Live Real-Time Preview** under both Light and Dark mode containers.
6. Click **"Save Logo Changes"**. The branding updates across all workstation screens instantly.

#### Method B: Environment Variable Declaration (`.env`)
You can define the default logo and branding centrally at build-time:
```env
VITE_APP_NAME="ANDON SMART FACTORY"
VITE_APP_COMPANY="Your Manufacturing Corp"
VITE_APP_LOGO_URL="https://your-domain.com/assets/corporate-logo.png"
```

#### Method C: Restoring Default Demo Identity
Click the **"Reset to Demo"** button inside the branding panel to revert all settings to the factory default demo profile at any time.

---

## 2. Master Data Management & CSV/Excel Upload

The system allows bulk importing of manufacturing assets to avoid manual data entry. You can upload files formatted as **`.CSV`** or **`.XLSX` (Microsoft Excel)**.

### How to Upload Master Data
1. Navigate to the **Master Data** tab.
2. Select the target sub-tab:
   * **Lines (Lini Produksi)**
   * **Machines (Daftar Mesin)**
   * **Operators & Users (Karyawan & Akun)**
3. Click the **"Import CSV / Excel"** button.
4. Select your prepared file. The system will validate headers, check for duplicates, clean empty rows, and persist the records into Cloud Firestore / local storage.
5. Review the import summary dialogue showing successful rows, skipped duplicates, and validation warnings.

---

## 3. CSV Template Specifications & Data Schemas

Sample template files are located in this folder:
* `template_lines.csv`
* `template_machines.csv`
* `template_operators.csv`

### 3.1 Production Lines Schema (`template_lines.csv`)
Defines the shop floor lines and associated workstations.

| Column Header | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `id` | **Yes** | `LINE-1` | Unique alphanumeric identifier for the line. |
| `name` | **Yes** | `Line 1: Machining & CNC` | Full descriptive display name. |
| `shortCode` | **Yes** | `L1-MCN` | Compact code for mobile terminals. |
| `department` | **Yes** | `Machining` | Plant department / cost center. |
| `leaderName` | No | `Bambang S.` | Line leader or shift foreman name. |
| `targetDaily` | No | `500` | Target daily output (used for OEE calculation). |
| `workstations` | **Yes** | `OP-10 Cut; OP-20 CNC; OP-30 QC` | Workstations separated by semicolon (`;`) or comma (`,`). |

### 3.2 Machines Master Schema (`template_machines.csv`)
Maps physical machinery to specific lines and workstations.

| Column Header | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `id` | **Yes** | `MCH-001` | Unique machine identifier. |
| `code` | **Yes** | `CNC-MILL-01` | Machine asset barcode / equipment tag. |
| `name` | **Yes** | `5-Axis CNC Milling Center` | Official machine nomenclature. |
| `lineId` | **Yes** | `LINE-1` | ID matching a valid production line. |
| `lineName` | No | `Line 1: Machining` | Line name for human readability. |
| `workstation` | **Yes** | `OP-20 CNC` | Station name where machine is stationed. |

### 3.3 Operators & Staff Schema (`template_operators.csv`)
Authorizes plant personnel, badges, and roles.

| Column Header | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `badgeId` | **Yes** | `OP-1001` | Employee ID / NPK used for badge sign-in. |
| `name` | **Yes** | `Agus Pratama` | Full employee name. |
| `role` | **Yes** | `operator` | Role: `operator`, `technician`, `supervisor`, `admin`. |
| `department` | **Yes** | `Machining` | Assigned department. |
| `email` | No | `agus@factory.local` | Contact email (optional). |

> **Note on Security**: Passwords and PINs are not accepted via CSV imports for security compliance. In Demo Mode, accounts default to standard testing PIN `1234`.

---

## 4. Trial / Demo Data Reset & Factory Clean Slate

Before commissioning the system for live production, all testing calls and simulated records must be purged.

### Step-by-Step Clean Slate Procedure:
1. Navigate to **Master Data** ➔ sub-tab **"Clean Data"** OR open the **Settings** modal ➔ **"Reset & Factory Clean"** section.
2. **Options Available**:
   * **Clean Trial Calls Only**: Clears all active and historic Andon work orders without altering line/machine master configurations.
   * **Complete Factory Reset**: Restores original factory master presets and clears all activity logs.
3. Confirm the safety dialog. The system will log the sanitation event to the **Audit Trail** and reload a pristine operational board.

---

## 5. Operational Modes (Demo Mode vs. Cloud Firebase)

The application supports a dual-engine data provider architecture:

### A. Demo Mode (`VITE_DATA_PROVIDER=demo`)
* **Use Case**: Offline sales demos, internal user training, and testing without internet connectivity.
* **Storage**: Browser memory and local client state.
* **Database Setup Required**: None (Zero-config).

### B. Cloud Firebase Mode (`VITE_DATA_PROVIDER=firebase`)
* **Use Case**: Real-time factory floor deployment across multi-display setups, tablets, and remote supervisor monitors.
* **Storage**: Google Cloud Firestore with real-time snapshot listeners.
* **Requirements**: Valid Firebase API keys declared in `.env`.

---

## 6. Incident Handling Lifecycle & 5-Why RCA

```
[1. Operator Call] ──▶ [2. Technician ACK] ──▶ [3. In-Progress Repair] ──▶ [4. 5-Why RCA Closure]
   (🔴 Red Alarm)         (🟡 Yellow State)       (⏱ Active Repair Time)      (🟢 Normal Reset)
```

1. **Trigger Call**: Operator clicks a station on the tablet terminal, selects category (Machine, Quality, Material, Safety), and toggles Line-Stop.
2. **Acknowledge (ACK)**: Maintenance technician acknowledges the ticket, stopping the response timer.
3. **Start Repair**: Technician initiates physical troubleshooting on the machine.
4. **Resolution & 5-Why RCA**: Before closing the ticket, the technician completes the **Root Cause Analysis** form (Why 1 through Why 5) and preventive actions to ensure long-term equipment reliability.

---

## 7. Telegram Bot Notification Integration

To broadcast immediate alerts to maintenance group chats:
1. Create a bot using [@BotFather](https://t.me/BotFather) on Telegram and obtain the bot token.
2. Add the bot to your maintenance team Telegram group and retrieve the Chat ID.
3. Declare variables in `.env`:
   ```env
   VITE_TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   VITE_TELEGRAM_CHAT_ID="-1009876543210"
   ```
4. New Work Orders will be automatically formatted and dispatched to the group in real-time.

---

## 8. Hardware Recommendations & TV Kiosk Mode Setup

To ensure uninterrupted 24/7 shop floor operation, follow these recommended hardware and operating system deployment guidelines:

### 8.1 Recommended Shop Floor Hardware

| Role / Station | Recommended Hardware | Specifications & Notes |
| :--- | :--- | :--- |
| **Plant Central Andon TV** | 55" – 75" Commercial LED Display + Mini PC / Chromebox / Intel NUC | • Resolution: 1080p (Full HD) or 4K.<br>• OS: Windows 10/11 IoT Enterprise, Ubuntu LTS, or ChromeOS.<br>• Mounting: Ceiling or high-wall bracket with clear line-of-sight. |
| **Operator Workstations** | 10.1" – 15.6" Industrial Panel PC or Rugged Tablet | • Capacitive touch screen (glove-compatible touch mode).<br>• IP54/IP65 dust & splash resistance.<br>• VESA arm mount at machine operator eye-level. |
| **Maintenance Technicians** | 8" – 10" Rugged Android / iOS Tablets or Mobile Phones | • WiFi 6 / 4G LTE roaming support across manufacturing bays.<br>• Shockproof casing for field troubleshooting. |

### 8.2 Automated TV Kiosk Mode Configuration

For ceiling-mounted Andon display TVs, configure the Mini PC to launch Chrome / Edge in fullscreen Kiosk Mode automatically on boot without displaying address bars, menus, or crash dialogues:

#### Windows Startup Shortcut (Chrome / Edge)
Create a shortcut in the Windows `shell:startup` folder:
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-session-crashed-bubble --disable-infobars --autoplay-policy=no-user-gesture-required "https://your-andon-app-url.com"
```

#### Linux / Raspberry Pi Display Autostart (`~/.config/lxsession/LXDE-pi/autostart`)
```bash
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk --autoplay-policy=no-user-gesture-required "https://your-andon-app-url.com"
```

### 8.3 Browser Audio Autoplay Permission
Modern web browsers (Google Chrome, Microsoft Edge, Safari) restrict audio autoplay until the user interacts with the page:
1. Open the Andon TV URL in Chrome / Edge.
2. Click the **Padlock icon (Site Settings)** on the address bar ➔ set **Sound** to **"Allow"**.
3. Alternatively, launch the browser with the flag: `--autoplay-policy=no-user-gesture-required` to guarantee that multi-tone sirens trigger without requiring a physical mouse click.

---

*Authored by: **Ressa Hidayat** — Industrial Solutions Creator*
