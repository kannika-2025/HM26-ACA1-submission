import { NextResponse } from "next/server";

const MODEL = "gemini-3.5-flash";

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
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is missing.",
          details: "GEMINI_API_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "No image was uploaded." },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "The uploaded file is not an image." },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    const prompt = `
You are the visual verification AI for a civic complaint application.

Analyze the attached image carefully.

Determine whether a supported civic problem is clearly visible.

Supported issues:
- Pothole
- Road Damage
- Open Manhole
- Broken Streetlight
- Water Leakage
- Overflowing Garbage Bin
- Waste Dumping
- Unsegregated Waste
- Unknown

Rules:

1. Analyze the actual image, not the user's selected issue.
2. A pothole must visibly show a hole or depression in a road surface.
3. Road damage must visibly show damaged road infrastructure.
4. Garbage problems must visibly show waste or an overflowing bin.
5. Do not use GPS or the user's description to identify the visual issue.
6. Normal rooms, floors, walls, people, selfies, laptops, documents,
   phones and unrelated objects must be Unknown.
7. If the image is blurry or ambiguous, return Unknown.
8. Do not invent an issue.
9. Confidence is 0-100.
10. Only return VERIFIED when the issue is clearly visible and confidence
    is at least 70.
11. Return ONLY valid JSON.

Return exactly:

{
  "issue": "Pothole",
  "confidence": 95,
  "evidenceStatus": "VERIFIED",
  "reason": "A clear pothole is visible in the road surface."
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: image.type,
                    data: base64Image,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini HTTP error:", response.status, responseText);

      return NextResponse.json(
        {
          error: "Gemini API request failed.",
          details: `Gemini returned HTTP ${response.status}.`,
        },
        { status: 502 }
      );
    }

    let geminiResponse: any;

    try {
      geminiResponse = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "Gemini returned an invalid response.",
        },
        { status: 502 }
      );
    }

    const generatedText =
      geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json(
        {
          error: "Gemini returned no analysis.",
          details: "No candidate response was returned.",
        },
        { status: 502 }
      );
    }

    let analysis: any;

    try {
      analysis = JSON.parse(generatedText);
    } catch {
      console.error("Invalid Gemini JSON:", generatedText);

      return NextResponse.json(
        {
          error: "Gemini returned invalid JSON.",
        },
        { status: 502 }
      );
    }

    const issue = ALLOWED_ISSUES.includes(analysis.issue)
      ? analysis.issue
      : "Unknown";

    const confidence =
      typeof analysis.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(analysis.confidence)))
        : 0;

    const verified =
      issue !== "Unknown" &&
      confidence >= 70 &&
      analysis.evidenceStatus === "VERIFIED";

    return NextResponse.json({
      issue: verified ? issue : "Unknown",
      confidence,
      evidenceStatus: verified ? "VERIFIED" : "NOT_VERIFIED",
      reason:
        typeof analysis.reason === "string"
          ? analysis.reason
          : "No supported civic issue was confidently detected.",
      canCreateComplaint: verified,
    });
  } catch (error) {
    console.error("Image analysis error:", error);

    return NextResponse.json(
      {
        error: "Unable to connect to Gemini.",
        details:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}