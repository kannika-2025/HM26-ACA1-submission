# PotholeWatch AI

> AI assistance disclosure: This project documentation was refined with AI-assisted writing support for clarity and structure. The underlying product concept, workflow, implementation, and technical decisions were developed as part of the project itself.

## Problem
Cities often receive noisy, duplicate, or poorly documented civic complaints. Residents struggle to report road damage clearly, and local authorities receive incomplete information that slows resolution. In many cases, the same issue is reported multiple times without useful verification or tracking.

## Solution
PotholeWatch AI is a smart civic complaint platform built for Mysuru that lets citizens report problems with a photo, GPS location, and issue details. The app uses AI to verify whether the uploaded image clearly shows a civic issue, checks the location for validity, detects duplicates, and routes complaints to the right authority or department.

Users can track status updates and view a public dashboard showing civic issue visibility and reporting activity.

## Why it matters
This solution brings transparency, accountability, and efficiency to civic issue management. It reduces duplicate reporting, improves complaint quality, helps city departments prioritize real issues faster, and gives citizens a clearer way to track the status of their complaint.

## Key features
- AI-based image verification for civic issues
- GPS and location validation for Mysuru service area
- Duplicate detection before complaint creation
- Department or authority routing suggestions
- Complaint tracking by ID
- Public dashboard for transparency
- Mobile-friendly PWA-style experience

## Supported issue types
The system is designed to detect and handle civic problems such as:
- Pothole
- Road Damage
- Open Manhole
- Broken Streetlight
- Water Leakage
- Overflowing Garbage Bin
- Waste Dumping
- Unsegregated Waste

## How it works
1. User uploads a photo of the civic issue.
2. The app captures or validates the user's location.
3. AI analyzes the image to determine whether the issue is clearly visible.
4. The app checks whether the report is a duplicate or likely repeat case.
5. The complaint is created with a status, routing logic, and evidence.
6. The user can track the complaint and view the public dashboard.

## Tech stack
- Next.js 14
- React + TypeScript
- Tailwind CSS
- Supabase
- Google Gemini API
- Hugging Face Inference

## Project structure
```text
src/
  app/
    api/
      analyze-image/route.ts
      verify/route.ts
    dashboard/page.tsx
    detect/page.tsx
    login/page.tsx
    report/page.tsx
    track/page.tsx
    page.tsx
    layout.tsx
    manifest.webmanifest
  lib/
    location.ts
    supabase.ts
```

## AI model workflow
This project uses multiple AI layers for better civic validation:

- Gemini checks whether the uploaded image clearly shows a supported civic issue and returns structured evidence.
- A second pothole-specific vision model performs additional validation for road damage classification.
- The app does not blindly trust the image; it requires clear evidence and flags weak or ambiguous inputs for review.

## Environment setup
Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_generative_ai_key
HF_TOKEN=your_huggingface_token
```

## Run locally
```bash
npm install
npm run dev
```

Open:
```text
http://localhost:3000
```

## Build for production
```bash
npm run build
npm run start
```

## Impact and value
PotholeWatch AI turns civic reporting from a vague, fragmented process into a structured digital workflow. It helps citizens report better, helps authorities act faster, and increases transparency for the community.

## Future scope
- real authority dashboards and admin panels
- automated escalation workflows
- live map-based issue visualization
- multilingual citizen support
- integration with government service APIs

## Conclusion
PotholeWatch AI is a practical MVP for smart-city civic reporting. It combines AI, geolocation, duplicate detection, and transparent tracking to improve how urban issues are submitted and resolved.
