import { NextResponse } from "next/server";

// Stable Gemini models.
// We try the newest model first, then fall back if it is temporarily unavailable.
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
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
You are an AI civic issue verification system for a Mysuru civic complaint application.

Analyze the uploaded image carefully.

Your job is to determine whether the image visibly contains one of these supported civic problems:

1. Pothole
2. Road Damage
3. Open Manhole
4. Broken Streetlight
5. Water Leakage
6. Overflowing Garbage Bin
7. Waste Dumping
8. Unsegregated Waste

IMPORTANT RULES:

- Only identify an issue if there is clear visual evidence in the image.
- Do NOT assume an issue just because the user may have selected that issue.
- Do NOT identify an issue from the filename.
- Do NOT invent details that cannot be seen.
- If the image does not clearly show a supported civic issue, return "Unknown".
- A normal road, normal street, person, building, vehicle, landscape, or unrelated object should NOT be treated as a civic issue.
- If the image is blurry or insufficient for reliable verification, return "Unknown".
- Confidence must be between 0 and 100.
- Evidence status must be either "VERIFIED" or "NOT_VERIFIED".
- Use "VERIFIED" only when the issue is clearly visible.
- Use "NOT_VERIFIED" when the issue is unclear or unsupported.

Return ONLY valid JSON.

Required JSON format:

{
  "issue": "Pothole",
  "confidence": 95,
  "evidenceStatus": "VERIFIED",
  "reason": "A large pothole is clearly visible on the road."
}

If no supported civic problem is clearly visible:

{
  "issue": "Unknown",
  "confidence": 0,
  "evidenceStatus": "NOT_VERIFIED",
  "reason": "No supported civic issue is clearly visible in the image."
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
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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
      },
    }),
  });
}

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Check API key
    // ---------------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is missing.",
        },
        {
          status: 500,
        }
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
          error: "No image was uploaded.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------------------------------
    // 3. Validate image type
    // ---------------------------------------------------------

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "The uploaded file is not an image.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------------------------------
    // 4. Limit image size
    // ---------------------------------------------------------

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Image is too large. Please use an image below 10 MB.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------------------------------
    // 5. Convert image to Base64
    // ---------------------------------------------------------

    const bytes = await image.arrayBuffer();

    const base64Image = Buffer.from(bytes).toString("base64");

    let lastError = "";

    // ---------------------------------------------------------
    // 6. Try Gemini models
    // ---------------------------------------------------------

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(
            `Trying Gemini model: ${model}, attempt: ${attempt + 1}`
          );

          const response = await callGemini(
            model,
            apiKey,
            image.type,
            base64Image
          );

          const responseText = await response.text();

          // ---------------------------------------------------
          // Successful Gemini response
          // ---------------------------------------------------

          if (response.ok) {
            let data: any;

            try {
              data = JSON.parse(responseText);
            } catch {
              lastError = `${model}: Gemini returned invalid JSON`;

              break;
            }

            const generatedText =
              data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!generatedText) {
              lastError = `${model}: Gemini returned no generated content`;

              break;
            }

            // -----------------------------------------------
            // Parse Gemini's JSON
            // -----------------------------------------------

            let analysis: any;

            try {
              analysis = JSON.parse(generatedText);
            } catch {
              lastError = `${model}: Gemini generated invalid JSON`;

              break;
            }

            // -----------------------------------------------
            // Validate issue
            // -----------------------------------------------

            const issue = ALLOWED_ISSUES.includes(
              analysis.issue
            )
              ? analysis.issue
              : "Unknown";

            // -----------------------------------------------
            // Validate confidence
            // -----------------------------------------------

            const confidence =
              typeof analysis.confidence === "number"
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(analysis.confidence)
                    )
                  )
                : 0;

            // -----------------------------------------------
            // Verify evidence
            // -----------------------------------------------

            const verified =
              issue !== "Unknown" &&
              confidence >= 70 &&
              analysis.evidenceStatus === "VERIFIED";

            // -----------------------------------------------
            // Return successful result
            // -----------------------------------------------

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

          // ---------------------------------------------------
          // Gemini returned an error
          // ---------------------------------------------------

          lastError = `${model}: HTTP ${response.status} - ${responseText.slice(
            0,
            500
          )}`;

          console.error(
            `Gemini error using ${model}:`,
            response.status,
            responseText
          );

          // ---------------------------------------------------
          // Retry temporary errors
          // ---------------------------------------------------

          if (
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504
          ) {
            if (attempt < 2) {
              await wait(1000 * Math.pow(2, attempt));
              continue;
            }

            break;
          }

          // Other errors are not worth retrying.
          break;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Unknown network error";

          console.error(
            `Gemini request failed using ${model}:`,
            error
          );

          // Retry network errors
          if (attempt < 2) {
            await wait(1000 * Math.pow(2, attempt));
            continue;
          }
        }
      }
    }

    // ---------------------------------------------------------
    // 7. All Gemini models failed
    // ---------------------------------------------------------

    console.error(
      "All Gemini attempts failed:",
      lastError
    );

    return NextResponse.json(
      {
        error: "Gemini is temporarily unavailable.",
        details: lastError,
      },
      {
        status: 503,
      }
    );
  } catch (error) {
    // ---------------------------------------------------------
    // 8. Unexpected server error
    // ---------------------------------------------------------

    console.error(
      "Image verification error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to process the image.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      },
      {
        status: 500,
      }
    );
  }
}