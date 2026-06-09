export const runtime = "nodejs";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const DEFAULT_MODEL_ID = "eleven_flash_v2_5";
const DEFAULT_SPEED = 0.7;
const MAX_TEXT_LENGTH = 1200;

function clampSpeed(value: unknown) {
  const speed = Number(value);
  if (!Number.isFinite(speed)) return DEFAULT_SPEED;
  return Math.min(1.2, Math.max(0.7, speed));
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

  if (!apiKey) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    text?: string;
    playbackRate?: number;
  } | null;
  const text = body?.text
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_TEXT_LENGTH);

  if (!text) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
          speed: clampSpeed(body?.playbackRate),
        },
      }),
    },
  );

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    return Response.json(
      { error: "ElevenLabs request failed", detail: errorText.slice(0, 500) },
      { status: response.status || 502 },
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
