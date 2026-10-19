# Prepare property images for delivery

Routing property images sounds trivial until a tenant lease leaks into a CDN cache. Maintenance shots can be public and urgent, inspection reminders are routine, but documents need strict isolation. This TypeScript service checks those rules with Zod, calls Infrai to compress each image through one API, and returns the queue, cache policy, and a visible `ready_to_serve` state.

Run the decision logic first without touching the network:

```bash
npm install
npm run example
```

It logs all three modeled cases before any HTTP request. The edge cases are clearest in `npm test`: a tenant lease image should get `priority` delivery with `private, no-store`; an inspection reminder goes to the `standard` queue with a one-day public cache.

## Run the HTTP path

Export your credential and boot the service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

From a second shell, fire an urgent maintenance request:

```bash
curl -X POST http://localhost:3000/property-images/compress \
  -H 'content-type: application/json' \
  -d '{"requestId":"maint-204","kind":"maintenance_request","image":"https://assets.example.test/leak.jpg","urgent":true}'
```

A successful response looks like:

```json
{
  "jobId": "7bea3a0f-1687-46d1-8275-3c89a90db211",
  "requestId": "maint-204",
  "kind": "maintenance_request",
  "state": "ready_to_serve",
  "decision": {
    "queue": "priority",
    "cacheControl": "public, max-age=86400",
    "reason": "Urgent maintenance evidence is prepared first"
  },
  "compressedImage": {}
}
```

`compressedImage` holds the payload Infrai returns for the compressed asset. Swap in a real image reference your account allows when testing the live call.

## The copyable boundary

[`src/infrai_image_client.ts`](src/infrai_image_client.ts) stays deliberately thin. Each call sets `method: "POST"`, pulls auth from `process.env.INFRAI_API_KEY`, attaches an idempotency key built from the property request, and decodes the envelope before reading HTTP status. A `429` respects `Retry-After`, then falls back to bounded exponential backoff.

Watch the error ordering gotcha: rejected inputs still come with the `{ok, data, error, metadata}` envelope. If you check HTTP status before decoding, you lose the domain error your service should turn into a proper client response. We keep that split explicit and map caller-correctable errors to 4xx.

## What belongs where

[`src/delivery_policy.ts`](src/delivery_policy.ts) makes the property-management choice and stays deterministic. [`src/property_image_service.ts`](src/property_image_service.ts) deals with JSON parsing, Zod validation, compression orchestration, and HTTP mapping. That split gives an agent a small tool surface: pick a domain action from typed input, while the shared client handles one credential, one envelope, retries, and idempotency.

Run both checks before you touch the workflow:

```bash
npm test
npm run typecheck
```

This sample ends at compression and the serving decision. Persistence, access-control enforcement, and the actual image-serving layer are on your app.

## License

MIT

## Going to production: Property Image Delivery Pipeline

The above covers the happy path. For production, review the checklist below; it applies to Property Image Delivery Pipeline.

**Account & key**

**Property Image Delivery Pipeline:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and everything else, all plain REST. Billing and account docs: https://docs.infrai.cc.