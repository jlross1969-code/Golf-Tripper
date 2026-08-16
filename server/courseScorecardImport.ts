import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";
import type { ImportedCourseScorecard } from "../shared/courseScorecardImport";

const scorecardSchema = {
  type: "object",
  properties: {
    courseName: { type: "string" },
    measurement: { type: "string", enum: ["meters", "yards"] },
    holes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          holeNumber: { type: "integer", minimum: 1, maximum: 18 },
          par: { type: "integer", minimum: 3, maximum: 6 },
          tees: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                distanceMeters: { type: "integer", minimum: 40, maximum: 900 },
                strokeIndex: { type: "integer", minimum: 1, maximum: 18 },
              },
              required: ["name", "distanceMeters", "strokeIndex"],
              additionalProperties: false,
            },
          },
        },
        required: ["holeNumber", "par", "tees"],
        additionalProperties: false,
      },
    },
  },
  required: ["courseName", "measurement", "holes"],
  additionalProperties: false,
} as const;

export async function extractCourseScorecard(imageKey: string): Promise<ImportedCourseScorecard> {
  if (!imageKey.startsWith("course-scorecards/")) throw new Error("Invalid scorecard image reference.");
  const imageUrl = await storageGetSignedUrl(imageKey);
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: "You extract golf scorecard data exactly. Never invent unreadable values. Return only the requested JSON.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this golf scorecard image. Extract all 18 holes, each hole's par, and every available tee column. For each tee, capture its displayed name, distance, and stroke index. If the image uses yards, convert each distance to nearest whole meters. If the course name is not visible, return an empty courseName; the admin will enter it. Use only tees with a full 18-hole set. Do not include totals or ratings. The measurement field must describe the source image before any conversion.",
          },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "golf_scorecard", strict: true, schema: scorecardSchema },
    },
    maxTokens: 8000,
  });
  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("The scorecard image could not be read.");
  const parsed = JSON.parse(content) as ImportedCourseScorecard;
  const uniqueHoles = new Set(parsed.holes.map((hole) => hole.holeNumber));
  if (uniqueHoles.size !== 18 || parsed.holes.length !== 18) {
    throw new Error("Please use a clear complete 18-hole scorecard image.");
  }
  return { ...parsed, holes: [...parsed.holes].sort((left, right) => left.holeNumber - right.holeNumber) };
}
