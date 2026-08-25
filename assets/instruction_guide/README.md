# Instruction Guide & Master Data Templates 📁

This directory contains administration manuals, operational guidelines, and standard CSV templates for the **Smart Andon Manufacturing System**.

---

## 📑 Contents

1. **`USER_GUIDE.md`**
   * Detailed step-by-step documentation for Plant Administrators, Supervisors, and IT Engineers.
   * Topics covered:
     - Custom Branding & Logo Customization (Upload, URL, and Text badge modes)
     - Master Data Upload procedures (Lines, Machines, Operators)
     - Demo & Trial Data Sanitation / Factory Clean Slate
     - Incident Handling Cycle with 5-Why Root Cause Analysis (RCA)
     - Multi-tier Role-Based Access Control (RBAC)
     - Telegram Notification Setup

2. **`template_lines.csv`**
   * Production Lines master import template.
   * Required columns: `id`, `name`, `shortCode`, `department`, `leaderName`, `targetDaily`, `workstations`.

3. **`template_machines.csv`**
   * Machinery and equipment asset mapping template.
   * Required columns: `id`, `code`, `name`, `lineId`, `lineName`, `workstation`.

4. **`template_operators.csv`**
   * User accounts, badges (NPK), and role assignment template.
   * Required columns: `badgeId`, `name`, `role`, `department`, `email`.

---

## 💡 Quick Tips for Master Data Uploads

* **Supported Formats**: `.CSV` and `.XLSX` (Microsoft Excel).
* **Workstations Format**: For `template_lines.csv`, separate multiple workstation names using a semicolon (`;`) or comma (`,`).
* **Header Matching**: The import engine auto-maps column headers (e.g., `badgeId`, `npk`, `userid`, `user_id` are all recognized interchangeably).
* **Duplicate Protection**: The system automatically skips duplicate Badge IDs and Machine Codes within the same upload batch.

---

*Authored by: **Ressa Hidayat** — Industrial Solutions Creator*
