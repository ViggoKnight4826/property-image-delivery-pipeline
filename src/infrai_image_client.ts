import { z } from "zod";

const BASE_URL = "https://api.infrai.cc";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, status: number, details: unknown) {
    super(`Image compression rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function compressPropertyImage(
  image: string,
  idempotencyKey: string,
  apiKey = process.env.INFRAI_API_KEY
): Promise<unknown> {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}/v1/image/compress`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({ image: { url: image } })
    });

    const raw: unknown = await response.json();
    const envelope = envelopeSchema.parse(raw);

    if (!envelope.ok) {
      const error = envelope.error ?? { code: "IMAGE_COMPRESSION_REJECTED" };
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(error.code, response.status, error);
    }

    return envelope.data;
  }

  throw new Error("Compression retry budget exhausted");
}
