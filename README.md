# PotholeWatch AI

> **Detect. Verify. Prioritize. Resolve.**

PotholeWatch AI is a Mysuru-focused civic complaint management MVP that helps citizens report potholes and other civic issues with evidence and location, while giving authorities a structured workflow to review, route, track, and resolve complaints.

##  Live MVP

**Live application:**  
https://potholewatch-ai-2026.vercel.app/

**GitHub repository:**  
https://github.com/kannika-2025/HM26-ACA1-submission

---

##  Problem

Civic complaints can be difficult to manage when reports are incomplete, duplicated, poorly documented, or sent to the wrong authority.

For road issues such as potholes, citizens need a simple way to provide:

- Photo evidence
- Location information
- Issue type
- Severity
- Description

Authorities need a structured way to:

- Receive complaints
- Route them to the appropriate authority
- Verify evidence
- Track progress
- Update resolution status
- Provide transparency to citizens

---

##  Solution

PotholeWatch AI provides an end-to-end civic complaint workflow:

**Report → Verify → Route → Track → Resolve**

A citizen can submit a civic issue using a photo, location, severity, and description.

The system then performs available evidence and location checks, assigns a suggested authority/department, stores the complaint, and provides a tracking ID.

An Office Head can manage the complaint lifecycle:

**Submitted → Acknowledged → In Progress → Fixed**

Citizens can track their complaints and view public complaint statistics through the dashboard.

---

##  Key Features

### 1. Citizen Complaint Reporting

Citizens can report civic issues with:

- Photo evidence
- GPS/location information
- Issue type
- Severity
- Description
- Contact information

### 2. Evidence Verification

The application provides an image-verification workflow for submitted evidence.

AI verification is attempted when the configured AI service is available. If AI verification is unavailable because of service limits or other failures, the complaint is safely placed into a **manual-review workflow** instead of being rejected automatically.

### 3. Location Validation

The application checks the submitted location against the configured Mysuru service-area logic and uses the location to support authority routing.

### 4. Authority Routing

Complaints can be routed toward the appropriate civic authority or department based on the submitted location and issue information.

### 5. Complaint Tracking

Every complaint receives a tracking ID.

Citizens can use the tracking page to view the complaint status and timeline.

### 6. Office Head Workflow

Office Head access is protected using **Supabase Authentication and Row Level Security (RLS)**.

Only the authorized Office Head account can modify complaint status.

Citizens can submit and track complaints but cannot directly modify the complaint status.

### 7. Public Dashboard

The dashboard provides visibility into:

- Total complaints
- Submitted complaints
- Acknowledged complaints
- In-progress complaints
- Fixed complaints
- Complaint activity

### 8. Mobile-Friendly Experience

The application is designed for mobile use and supports a PWA-style experience.

Citizens can access the reporting workflow from a phone and use device camera/location capabilities where supported by the browser.

---

##  Supported Civic Issues

The reporting workflow is designed to support issues such as:

- Pothole
- Road Damage
- Open Manhole
- Broken Streetlight
- Water Leakage
- Overflowing Garbage
- Waste Dumping
- Unsegregated Waste

---

##  Application Workflow

```text
Citizen
   ↓
Login / Register
   ↓
Report Civic Issue
   ↓
Photo + Location + Issue Details
   ↓
Evidence / Location Checks
   ↓
Authority & Department Routing
   ↓
Complaint Created
   ↓
Tracking ID Generated
   ↓
Office Head Review
   ↓
Acknowledged
   ↓
In Progress
   ↓
Fixed
