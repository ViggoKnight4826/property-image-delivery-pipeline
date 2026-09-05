import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { ZodError, z } from "zod";
import { decideDelivery, propertyImageSchema } from "./delivery_policy.js";
import { compressPropertyImage, InfraiError } from "./infrai_image_client.js";

const requestSchema = z.object({ requestId: z.string().min(1) }).and(propertyImageSchema);

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/property-images/compress") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = requestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const decision = decideDelivery(input);
    const compressedImage = await compressPropertyImage(
      input.image,
      `property-image:${input.requestId}`
    );

    send(response, 200, {
      jobId: randomUUID(),
      requestId: input.requestId,
      kind: input.kind,
      state: "ready_to_serve",
      decision,
      compressedImage
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid property image request" });
      return;
    }
    if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code
      });
      return;
    }
    send(response, 500, { error: "Unable to prepare property image" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Property image service listening on http://localhost:${port}`);
});
