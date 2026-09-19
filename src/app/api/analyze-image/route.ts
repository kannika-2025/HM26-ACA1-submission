import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ISSUES = [
  "Pothole",
  "Road Damage",
  "Open Manhole",
  "Broken Streetlight",
  "Water Leakage",
  "Overflowing Garbage Bin",
  "Waste Dumping",
  "Unsegregated Waste",
  "Unknown",
] as const;

type AllowedIssue = (typeof ALLOWED_ISSUES)[number];

type GeminiAnalysis = {
  issue?: string;
  confidence?: number;
  evidenceStatus?: string;
  reason?: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Gemini API error";
  }
}

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Check Gemini API key
    // ---------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is not configured.",
          details:
            "GEMINI_API_KEY is missing from the Vercel Production environment.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 2. Read uploaded image
    // ---------------------------------------------------------
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          error: "No image was provided.",
          details: "The request must contain an image field.",
        },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "Invalid file type.",
          details: `Received file type: ${image.type}`,
        },
        { status: 400 }
      );
    }

    // Prevent unnecessarily large uploads.
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: "Image is too large.",
          details: "Please use an image smaller than 10 MB.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 3. Convert image to Base64
    // ---------------------------------------------------------
    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    // ---------------------------------------------------------
    // 4. Create Gemini client
    // ---------------------------------------------------------
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    // ---------------------------------------------------------
    // 5. AI verification instructions
    // ---------------------------------------------------------
    const prompt = `
You are the evidence verification AI for a civic complaint application
called PotholeWatch AI.

Analyze the ACTUAL IMAGE provided to you.

Your task is to determine whether the image visibly contains a real,
supported civic problem.

SUPPORTED CIVIC PROBLEMS:

- Pothole
- Road Damage
- Open Manhole
- Broken Streetlight
- Water Leakage
- Overflowing Garbage Bin
- Waste Dumping
- Unsegregated Waste
- Unknown

IMPORTANT RULES:

1. Analyze the actual image.
2. Do NOT simply trust the user's selected issue type.
3. Do NOT use GPS, address, location or description to determine the
   visual issue.
4. A pothole must visibly show a depression, hole or significant
   damaged section of a road surface.
5. Road Damage must visibly show damaged road infrastructure.
6. Open Manhole must visibly show an uncovered/open manhole.
7. Broken Streetlight must visibly show damaged public streetlight
   infrastructure.
8. Water Leakage must visibly show water leaking from public
   infrastructure.
9. Overflowing Garbage Bin must visibly show a garbage bin containing
   overflowing waste.
10. Waste Dumping must visibly show waste dumped in a public area.
11. Unsegregated Waste must visibly show mixed waste relevant to public
    waste management.
12. Normal rooms, floors, walls, ceilings, laptops, phones, documents,
    people, selfies, portraits, food, animals, trees, ordinary vehicles
    and unrelated objects must be Unknown.
13. A photograph of a screen displaying a pothole MAY be classified as
    Pothole if the displayed pothole is clearly visible.
14. If the image is blurry, too dark, obstructed or ambiguous, return
    Unknown.
15. Never invent an issue that is not visibly supported.
16. Confidence must represent confidence that the civic issue is
    actually visible.
17. If confidence is below 70, return Unknown.
18. VERIFIED is allowed only when:
    - issue is not Unknown
    - confidence is at least 70
    - the issue is clearly visible
19. Return ONLY valid JSON.
20. Do not include markdown or code fences.

Return exactly this JSON structure:

{
  "issue": "Pothole",
  "confidence": 95,
  "evidenceStatus": "VERIFIED",
  "reason": "A clear depression is visible in the road surface."
}

For an invalid image:

{
  "issue": "Unknown",
  "confidence": 20,
  "evidenceStatus": "NOT_VERIFIED",
  "reason": "The image does not clearly show a supported civic problem."
}

The issue must be one of the supported civic problems.

The confidence must be an integer from 0 to 100.

Use VERIFIED only when the issue is clearly visible and confidence
is at least 70.

Otherwise use NOT_VERIFIED.
`;

    // ---------------------------------------------------------
    // 6. Send image to Gemini
    // ---------------------------------------------------------
    let result;

    try {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: image.type,
            data: base64Image,
          },
        },
        prompt,
      ]);
    } catch (error) {
      const details = errorMessage(error);

      console.error("Gemini API request failed:", details);

      return NextResponse.json(
        {
          error: "Gemini API request failed.",
          details,
        },
        { status: 502 }
      );
    }

    // ---------------------------------------------------------
    // 7. Read Gemini response
    // ---------------------------------------------------------
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty response.",
          details: "No analysis was returned by the Gemini model.",
        },
        { status: 502 }
      );
    }

    // ---------------------------------------------------------
    // 8. Parse JSON
    // ---------------------------------------------------------
    let analysis: GeminiAnalysis;

    try {
      analysis = JSON.parse(responseText);
    } catch (error) {
      console.error("Invalid Gemini JSON:", responseText);

      return NextResponse.json(
        {
          error: "Gemini returned invalid JSON.",
          details:
            error instanceof Error
              ? error.message
              : "Unable to parse Gemini response.",
        },
        { status: 502 }
      );
    }

    // ---------------------------------------------------------
    // 9. Validate issue
    // ---------------------------------------------------------
    const detectedIssue: AllowedIssue = ALLOWED_ISSUES.includes(
      analysis.issue as AllowedIssue
    )
      ? (analysis.issue as AllowedIssue)
      : "Unknown";

    // ---------------------------------------------------------
    // 10. Validate confidence
    // ---------------------------------------------------------
    const confidence =
      typeof analysis.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(analysis.confidence)))
        : 0;

    // ---------------------------------------------------------
    // 11. Determine final verification status
    // ---------------------------------------------------------
    const verified =
      detectedIssue !== "Unknown" &&
      confidence >= 70 &&
      analysis.evidenceStatus === "VERIFIED";

    const finalIssue: AllowedIssue = verified
      ? detectedIssue
      : "Unknown";

    const finalStatus = verified
      ? "VERIFIED"
      : "NOT_VERIFIED";

    const reason =
      typeof analysis.reason === "string" && analysis.reason.trim()
        ? analysis.reason.trim()
        : verified
          ? "A supported civic issue was detected in the image."
          : "The image does not contain sufficiently clear evidence of a supported civic issue.";

    // ---------------------------------------------------------
    // 12. Return result to frontend
    // ---------------------------------------------------------
    return NextResponse.json({
      issue: finalIssue,
      confidence,
      evidenceStatus: finalStatus,
      reason,
      canCreateComplaint: verified,
    });
  } catch (error) {
    const details = errorMessage(error);

    console.error("Unexpected image analysis error:", details);

    return NextResponse.json(
      {
        error: "Unable to analyze the image with Gemini.",
        details,
      },
      { status: 500 }
    );
  }
}