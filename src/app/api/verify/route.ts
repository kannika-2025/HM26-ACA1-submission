import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AIResult = {
  is_pothole: boolean;
  decision: "VERIFIED" | "NOT_A_POTHOLE" | "NEEDS_REVIEW";
  confidence: number;
  severity: "Minor" | "Major" | "Dangerous" | "Unknown";
  explanation: string;
};

export async function POST(request: Request) {
  try {
    const token = process.env.HF_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error: "HF_TOKEN is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const image = body.image;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        {
          error: "No image was provided.",
        },
        { status: 400 }
      );
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        {
          error: "Invalid image format.",
        },
        { status: 400 }
      );
    }

    const hf = new InferenceClient(token);

    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-VL-3B-Instruct",

      messages: [
        {
          role: "system",
          content: `
You are a road-inspection AI for a civic complaint application.

Your ONLY task is to determine whether the submitted image contains
VISIBLE evidence of a real pothole or significant road-surface damage.

IMPORTANT:
Do NOT assume that every submitted image contains a pothole.

A pothole normally has visible evidence such as:
- a depression or hole in the road
- broken or missing road surface
- a cavity in asphalt or concrete
- damaged road material surrounding the depression

Images showing the following should NOT be classified as potholes:
- posters
- books
- screens
- people
- buildings
- vehicles without visible road damage
- normal roads
- signs
- trees
- landscapes
- unrelated objects
- screenshots
- random photographs

If the image is blurry, dark, obstructed, too distant,
or otherwise ambiguous, use NEEDS_REVIEW.

Return ONLY valid JSON.

Required JSON structure:

{
  "is_pothole": true,
  "decision": "VERIFIED",
  "confidence": 90,
  "severity": "Major",
  "explanation": "A visible pothole is present in the road surface."
}

Decision rules:

VERIFIED:
Use only when a pothole is clearly visible.

NOT_A_POTHOLE:
Use when the image clearly does not show a pothole.

NEEDS_REVIEW:
Use when the image is unclear or insufficient to make a reliable decision.

Confidence:
Return an integer from 0 to 100.
This is an AI confidence estimate, NOT a statistically calibrated probability.

Severity:
Minor = small/localized damage.
Major = substantial visible road damage.
Dangerous = visibly serious road hazard.
Unknown = insufficient evidence.

Never invent objects, locations, severity, or damage that cannot be seen.
`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Carefully inspect this image.

Answer these questions:

1. Is there a pothole visibly present?
2. Is this actually a road-surface image?
3. What is the confidence from 0 to 100?
4. If it is a pothole, what is the visible severity?
5. Briefly explain the visual evidence.

Return JSON only.
`,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],

      temperature: 0,
      max_tokens: 300,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "The AI returned no result.",
        },
        { status: 502 }
      );
    }

    const text =
      typeof content === "string"
        ? content
        : JSON.stringify(content);

    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let result: AIResult;

    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("Invalid AI JSON:", text);

      return NextResponse.json(
        {
          error: "The AI returned an invalid response.",
        },
        { status: 502 }
      );
    }

    const confidence = Math.max(
      0,
      Math.min(100, Number(result.confidence) || 0)
    );

    let decision: AIResult["decision"];

    if (
      result.decision === "VERIFIED" ||
      result.decision === "NOT_A_POTHOLE" ||
      result.decision === "NEEDS_REVIEW"
    ) {
      decision = result.decision;
    } else {
      decision = "NEEDS_REVIEW";
    }

    return NextResponse.json({
      is_pothole: Boolean(result.is_pothole),
      decision,
      confidence,
      severity: result.severity || "Unknown",
      explanation:
        result.explanation || "The AI did not provide an explanation.",
    });
  } catch (error) {
    console.error("Pothole AI verification error:", error);

    return NextResponse.json(
      {
        error: "Unable to analyze the image.",
      },
      { status: 500 }
    );
  }
}