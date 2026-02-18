import { uploadToR2 } from "./r2";

export interface ImageGenConfig {
  imageModel: string;
  imagePrompt: string | null;
  referenceMedia: string[];
}

export function buildImagePrompt(
  node: { titel: string; beschreibung: string; context: string },
  imagePrompt?: string | null,
): string {
  const base = `Atmospheric scene: ${node.context}. Keywords: ${node.beschreibung}. Concept: ${node.titel}. Cinematic, moody lighting, high quality, photorealistic.`;
  if (imagePrompt) return `${imagePrompt}\n\n${base}`;
  return base;
}

export async function generateNodeImage(
  prompt: string,
  nodeId: string,
  config: ImageGenConfig,
): Promise<string | null> {
  const provider = config.imageModel.startsWith("hf:") ? "HuggingFace" : "Gemini";
  console.log(`[imageGen] START node=${nodeId} provider=${provider} model=${config.imageModel}`);
  const t0 = Date.now();
  try {
    let url: string | null;
    if (config.imageModel.startsWith("hf:")) {
      url = await generateWithHuggingFace(prompt, nodeId, config.imageModel.slice(3));
    } else {
      url = await generateWithGemini(prompt, nodeId, config);
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (url) {
      console.log(`[imageGen] OK node=${nodeId} ${elapsed}s → ${url}`);
    } else {
      console.log(`[imageGen] FAIL node=${nodeId} ${elapsed}s (returned null)`);
    }
    return url;
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[imageGen] ERROR node=${nodeId} ${elapsed}s:`, err);
    return null;
  }
}

// --- Gemini provider ---

async function generateWithGemini(prompt: string, nodeId: string, config: ImageGenConfig): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[imageGen] GEMINI_API_KEY not set");
    return null;
  }

  const model = config.imageModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build parts: reference images (as inlineData) + text prompt
  const parts: GeminiPart[] = [];

  // Fetch and include reference images
  if (config.referenceMedia.length > 0) {
    const refs = await fetchReferenceImages(config.referenceMedia);
    for (const ref of refs) {
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
    }
  }

  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[imageGen] Gemini API error ${res.status}: ${errText}`);
    return null;
  }

  const data = await res.json();
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    console.error("[imageGen] Gemini returned no candidates");
    return null;
  }

  // Find the image part in the response
  const imagePart = candidates[0].content?.parts?.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData,
  );

  if (!imagePart?.inlineData) {
    console.error("[imageGen] Gemini response has no image data");
    return null;
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  const mimeType: string = imagePart.inlineData.mimeType || "image/png";
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const key = `tree-images/${nodeId}.${ext}`;

  const publicUrl = await uploadToR2(key, imageBuffer, mimeType);
  return publicUrl;
}

// --- HuggingFace fallback provider ---

async function generateWithHuggingFace(prompt: string, nodeId: string, model: string): Promise<string | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.error("[imageGen] HUGGINGFACE_API_KEY not set");
    return null;
  }

  const hfUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
  const res = await fetch(hfUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!res.ok) {
    console.error(`[imageGen] HF API error ${res.status}: ${await res.text().catch(() => "")}`);
    return null;
  }

  const imageBuffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `tree-images/${nodeId}.${ext}`;

  const publicUrl = await uploadToR2(key, imageBuffer, contentType);
  return publicUrl;
}

// --- Helpers ---

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function fetchReferenceImages(urls: string[]): Promise<{ mimeType: string; base64: string }[]> {
  const results: { mimeType: string; base64: string }[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const mimeType = res.headers.get("content-type") || "image/jpeg";
      // Only include images (skip PDFs etc. for now — Gemini image gen only accepts images)
      if (!mimeType.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      results.push({ mimeType, base64: buf.toString("base64") });
    } catch {
      console.error(`[imageGen] Failed to fetch reference: ${url}`);
    }
  }
  return results;
}
