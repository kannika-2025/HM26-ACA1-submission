import { NextResponse } from "next/server";

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

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

const PROMPT = `
You are the visual verification AI for PotholeWatch AI.

Analyze the actual image carefully.

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

IMPORTANT RULES:

1. Analyze the actual image itself.
2. Do not trust the user's selected issue.
3. Do not use GPS or location.
4. A Pothole must visibly show a hole, depression, or broken section
   of a road surface.
5. Road Damage must visibly show damaged road infrastructure.
6. Open Manhole must visibly show an uncovered manhole.
7. Broken Streetlight must visibly show damaged streetlight infrastructure.
8. Water Leakage must visibly show water leaking from public infrastructure.
9. Overflowing Garbage Bin must visibly show an overflowing public bin.
10. Waste Dumping must visibly show waste dumped in a public area.
11. Unsegregated Waste must visibly show mixed waste relevant to
    public waste management.
12. Normal rooms, floors, walls, people, selfies, laptops, phones,
    documents, food, animals, trees and unrelated objects are Unknown.
13. If a pothole is clearly visible on a computer or phone screen,
    it can still be classified as Pothole.
14. If the image is unclear, blurry or ambiguous, return Unknown.
15. Never invent an issue.
16. Confidence must be from 0 to 100.
17. Confidence must represent how clearly the issue is visible.
18. VERIFIED is allowed only when the issue is clearly visible and
    confidence is at least 70.
19. Return ONLY valid JSON.
20. Do not return markdown.

Return exactly:

{
  "issue": "Pothole",
  "confidence": 95,
  "evidenceStatus": "VERIFIED",
  "reason": "A large pothole is clearly visible in the road surface."
}

For an unrelated image:

{
  "issue": "Unknown",
  "confidence": 10,
  "evidenceStatus": "NOT_VERIFIED",
  "reason": "No supported civic problem is clearly visible."
}
`;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  model: string,
  apiKey: string,
  mimeType: string,
  base64Image: string
) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent`;

  return fetch(url, {
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
                mimeType,
                data: base64Image,
              },
            },
            {
              text: PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
      },
    }),
  });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is missing.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          error: "No image was uploaded.",
        },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "The uploaded file is not an image.",
        },
        { status: 400 }
      );
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Image is too large. Please use an image below 10 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    let lastError = "";

    // Try the models in order.
    for (const model of MODELS) {
      // Retry each model up to 3 times.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await callGemini(
            model,
            apiKey,
            image.type,
            base64Image
          );

          const responseText = await response.text();

          if (response.ok) {
            let data: any;

            try {
              data = JSON.parse(responseText);
            } catch {
              lastError = `${model}: invalid JSON response`;
              break;
            }

            const generatedText =
              data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!generatedText) {
              lastError = `${model}: no generated content`;
              break;
            }

            let analysis: any;

            try {
              analysis = JSON.parse(generatedText);
            } catch {
              lastError = `${model}: invalid generated JSON`;
              break;
            }

            const issue = ALLOWED_ISSUES.includes(analysis.issue)
              ? analysis.issue
              : "Unknown";

            const confidence =
              typeof analysis.confidence === "number"
                ? Math.max(
                    0,
                    Math.min(100, Math.round(analysis.confidence))
                  )
                : 0;

            const verified =
              issue !== "Unknown" &&
              confidence >= 70 &&
              analysis.evidenceStatus === "VERIFIED";

            return NextResponse.json({
              issue: verified ? issue : "Unknown",
              confidence,
              evidenceStatus: verified
                ? "VERIFIED"
                : "NOT_VERIFIED",
              reason:
                typeof analysis.reason === "string"
                  ? analysis.reason
                  : verified
                    ? "A supported civic problem was detected."
                    : "No supported civic problem was clearly detected.",
              canCreateComplaint: verified,
              model,
            });
          }

          lastError = `${model}: HTTP ${response.status}`;

          // 503/429/5xx are temporary errors.
          if (
            response.status === 503 ||
            response.status === 429 ||
            response.status >= 500
          ) {
            if (attempt < 2) {
              await wait(1000 * Math.pow(2, attempt));
              continue;
            }

            break;
          }

          // 400/401/403/etc. are not fixed by retrying.
          break;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Network error";

          if (attempt < 2) {
            await wait(1000 * Math.pow(2, attempt));
            continue;
          }
        }
      }
    }

    console.error("All Gemini attempts failed:", lastError);

    return NextResponse.json(
      {
        error: "Gemini is temporarily unavailable.",
        details: lastError,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Image verification error:", error);

    return NextResponse.json(
      {
        error: "Unable to process the image.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}