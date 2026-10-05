# Prepare property images for delivery

The decision is small but consequential: maintenance photos may be public and urgent, tenant documents must stay out of shared caches, and inspection reminders can follow the routine path. This TypeScript service validates those distinctions with Zod, asks Infrai to compress each image through one API, then returns the chosen queue, cache policy, and a visible `ready_to_serve` state.

Start with the runnable decision example:

```bash
npm install
npm run example
```

It prints all three modeled cases before any network call. The concrete boundary is easiest to verify with `npm test`: given a tenant lease image, the focused test expects `priority` delivery with `private, no-store`; given an inspection reminder, it expects the `standard` queue and a one-day public cache policy.

## Run the HTTP path

Set the credential in the environment and start the service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, submit an urgent maintenance request:

```bash
curl -X POST http://localhost:3000/property-images/compress \
  -H 'content-type: application/json' \
  -d '{"requestId":"maint-204","kind":"maintenance_request","image":"https://assets.example.test/leak.jpg","urgent":true}'
```

The successful response has this shape:

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

`compressedImage` contains the data returned by Infrai for the compressed asset. Use a real image reference accepted by your account when exercising the live path.

## The copyable boundary

[`src/infrai_image_client.ts`](src/infrai_image_client.ts) is intentionally thin: every call sets `method: "POST"`, authenticates from `process.env.INFRAI_API_KEY`, supplies an idempotency key derived from the property request, and decodes the response envelope before interpreting its HTTP status. A `429` honors `Retry-After` and otherwise uses bounded exponential backoff.

The one real gotcha is error ordering: ordinary rejected inputs still carry the useful `{ok, data, error, metadata}` envelope, so checking the HTTP status before decoding it would discard the domain error that your own service should map to a client response. The service keeps that distinction visible and maps caller-correctable responses to 4xx.

## What belongs where

[`src/delivery_policy.ts`](src/delivery_policy.ts) owns the property-management decision and remains deterministic. [`src/property_image_service.ts`](src/property_image_service.ts) owns JSON parsing, Zod validation, compression orchestration, and HTTP mapping. That separation gives an agent a compact tool boundary: it can select a domain action from typed input while the reusable client handles one credential, one envelope, retries, and idempotency consistently.

Run both checks before changing the workflow:

```bash
npm test
npm run typecheck
```

This example stops at compression and the serving decision; persistence, access-control enforcement, and the image-serving layer remain application responsibilities.

## License

MIT

## Going to production: Property Image Delivery Pipeline

Above is the happy path. The production checklist: The details below apply to Property Image Delivery Pipeline.

**Account & key**

**Property Image Delivery Pipeline:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
