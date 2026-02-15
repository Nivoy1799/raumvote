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
      question: { type: "string", description: "Reflective question revealing what the user did NOT choose and what the alternative path represents." },
      left: {
        type: "object",
        properties: {
          titel: { type: "string", description: "Max 2 words." },
          beschreibung: { type: "string", description: "Max 4 keywords." },
          context: { type: "string", description: "Free-form scene description: atmosphere, persona situation, spatial setting, emotional tone." },
        },
        required: ["titel", "beschreibung", "context"],
        additionalProperties: false,
      },
      right: {
        type: "object",
        properties: {
          titel: { type: "string", description: "Max 2 words." },
          beschreibung: { type: "string", description: "Max 4 keywords." },
          context: { type: "string", description: "Free-form scene description: atmosphere, persona situation, spatial setting, emotional tone." },
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
        content: `The user has followed this path through the decision tree:\n\n${episodeText}\n\nGenerate the next two choices and a reflective question for the current node.`,
      },
    ],
    temperature: 0.9,
  });

  return JSON.parse(response.choices[0].message.content!);
}
