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
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "No image was provided." },
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

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
You are the AI evidence verification system for a civic complaint application.

Analyze the ACTUAL IMAGE provided.

Your task is to determine whether the image visibly contains a genuine civic infrastructure or public cleanliness problem.

Supported civic issues:

${ALLOWED_ISSUES.map((issue) => `- ${issue}`).join("\n")}

STRICT RULES:

1. Analyze ONLY what is visibly present in the image.
2. Do NOT trust the user's selected complaint type.
3. Do NOT use GPS or location to decide what is visible.
4. A pothole must visibly look like road surface damage/depression.
5. Road damage must visibly show damaged road infrastructure.
6. Open manhole must visibly show an open or uncovered manhole.
7. Broken streetlight must visibly show a damaged/non-functioning public streetlight.
8. Water leakage must visibly show water leaking from public infrastructure.
9. Overflowing garbage bin must visibly show a garbage bin overflowing with waste.
10. Waste dumping must visibly show dumped waste in a public area.
11. Unsegregated waste must visibly show mixed waste that is relevant to public waste management.
12. Normal floors, walls, ceilings, rooms, laptops, phones, people, selfies, portraits,
    food, animals, trees, ordinary vehicles, documents, screenshots and unrelated objects
    must be classified as Unknown.
13. A photograph of a computer screen displaying a pothole image MAY be classified as
    Pothole if the displayed image clearly and visibly shows the pothole.
14. If the image is blurry, too dark, heavily obstructed, or ambiguous, return Unknown.
15. Never invent an issue that cannot be visually supported.
16. Confidence must represent confidence that the civic issue is actually visible.
17. If confidence is below 70, return Unknown.
18. Only return VERIFIED when the issue is clearly visible and confidence is at least 70.
19. Return ONLY valid JSON.

Return exactly:

{
  "issue": "Pothole",
  "confidence": 95,
  "evidenceStatus": "VERIFIED",
  "reason": "A large depression is clearly visible in the road surface."
}

For an invalid image:

{
  "issue": "Unknown",
  "confidence": 20,
  "evidenceStatus": "NOT_VERIFIED",
  "reason": "The image does not clearly show a supported civic problem."
}

The "issue" must be one of the supported issues.

The "confidence" must be an integer from 0 to 100.

Use "VERIFIED" only when:
- issue is not Unknown
- confidence >= 70
- the civic problem is clearly visible

Otherwise use "NOT_VERIFIED".
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: image.type,
          data: base64Image,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();

    let analysis: {
      issue?: string;
      confidence?: number;
      evidenceStatus?: string;
      reason?: string;
    };

    try {
      analysis = JSON.parse(responseText);
    } catch {
      console.error("Gemini returned:", responseText);

      return NextResponse.json(
        {
          error: "Gemini returned an invalid JSON response.",
        },
        { status: 502 }
      );
    }

    const issue = ALLOWED_ISSUES.includes(analysis.issue || "")
      ? analysis.issue!
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
          : "No supported civic issue could be confidently identified.",
      canCreateComplaint: verified,
    });
  } catch (error) {
    console.error("Gemini image analysis error:", error);

    return NextResponse.json(
      {
        error: "Unable to analyze the image with Gemini.",
      },
      { status: 500 }
    );
  }
}