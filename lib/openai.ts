import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export type EpisodeStep = {
  titel: string;
  beschreibung: string;
  context: string;
  side: string | null;
};

export type GeneratedNodes = {
  question: string;
  left: { titel: string; beschreibung: string; context: string };
  right: { titel: string; beschreibung: string; context: string };
};

const RESPONSE_SCHEMA = {
  name: "tree_generation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description:
          "A provocative either-or question (in German) that frames the upcoming choice as a genuine dilemma. It should highlight the tension between the two options.",
      },
      left: {
        type: "object",
        properties: {
          titel: {
            type: "string",
            description: "Max 2 words. Must be clearly distinct from right.titel — different concept, not a synonym.",
          },
          beschreibung: {
            type: "string",
            description: "Max 4 keywords. Must describe a noticeably different direction than right.beschreibung.",
          },
          context: {
            type: "string",
            description:
              "Free-form scene description: atmosphere, persona situation, spatial setting, emotional tone. Must contrast with right.context in at least 2 dimensions (e.g. mood, setting, scale, era).",
          },
        },
        required: ["titel", "beschreibung", "context"],
        additionalProperties: false,
      },
      right: {
        type: "object",
        properties: {
          titel: {
            type: "string",
            description: "Max 2 words. Must be clearly distinct from left.titel — different concept, not a synonym.",
          },
          beschreibung: {
            type: "string",
            description: "Max 4 keywords. Must describe a noticeably different direction than left.beschreibung.",
          },
          context: {
            type: "string",
            description:
              "Free-form scene description: atmosphere, persona situation, spatial setting, emotional tone. Must contrast with left.context in at least 2 dimensions (e.g. mood, setting, scale, era).",
          },
        },
        required: ["titel", "beschreibung", "context"],
        additionalProperties: false,
      },
    },
    required: ["question", "left", "right"],
    additionalProperties: false,
  },
} as const;

export async function generateTreeNodes(
  systemPrompt: string,
  episode: EpisodeStep[],
  modelName: string = "gpt-4o",
): Promise<GeneratedNodes> {
  const episodeText = episode
    .map((n, i) => `Step ${i + 1} (${n.side ?? "root"}): "${n.titel}" — ${n.beschreibung}\n  Context: ${n.context}`)
    .join("\n\n");

  const response = await getOpenAI().chat.completions.create({
    model: modelName,
    response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `The user has followed this path through the decision tree:\n\n${episodeText}\n\nGenerate the next two choices and a reflective question for the current node.\n\nCRITICAL: The two options MUST represent genuinely different directions — not variations of the same idea. Think of them as opposing philosophies, contrasting aesthetics, or fundamentally different approaches. A user should immediately see why picking left vs right leads to a completely different outcome. Avoid synonyms, similar vibes, or options that only differ in minor details.`,
      },
    ],
    temperature: 0.8,
  });

  return JSON.parse(response.choices[0].message.content!);
}
