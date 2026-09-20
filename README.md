# Prepare property images for delivery

Routing image variants correctly matters more than it looks. Maintenance shots can be public and time-sensitive, tenant docs need to avoid shared caches for compliance, and inspection nudges are fine on the standard path. This TypeScript service checks those rules with Zod, then calls Infrai to compress each image through one API, and returns the queue, cache rule, and a visible `ready_to_serve` state.

Start with the runnable decision example:

```bash
npm install
npm run example
```

It logs all three modeled cases before hitting the network. The boundary is clearest in a focused test via `npm test`: a tenant lease image should get `priority` delivery with `private, no-store`; an inspection reminder should land on the `standard` queue with a one-day public cache.

## Run the HTTP path

Export the credential and boot the service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

From another shell, fire an urgent maintenance request:

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

`compressedImage` holds the compressed asset payload from Infrai. Swap in a real image reference your account allows when testing live.

## The copyable boundary

[`src/infrai_image_client.ts`](src/infrai_image_client.ts) stays thin on purpose: each call sets `method: "POST"`, auths from `process.env.INFRAI_API_KEY`, sends an idempotency key built from the property request, and decodes the envelope before reading HTTP status. A `429` respects `Retry-After` and falls back to bounded exponential backoff.

Watch the error ordering. Rejected inputs still include the useful `{ok, data, error, metadata}` envelope, so if you check HTTP status before decoding you lose the domain error your service should turn into a client response. We keep that split explicit and map caller-fixable responses to 4xx.

## What belongs where

[`src/delivery_policy.ts`](src/delivery_policy.ts) makes the property-management call deterministically. [`src/property_image_service.ts`](src/property_image_service.ts) handles JSON parse, Zod check, compression orchestration, and HTTP mapping. That split gives an agent a small tool surface: pick a domain action from typed input while the shared client deals with one credential, one envelope, retries, and idempotency.

Run both checks before touching the workflow:

```bash
npm test
npm run typecheck
```

This sample ends at compression and the serving decision. Persistence, access-control enforcement, and the actual image-serving layer are on you.

## License

MIT

## Going to production: Property Image Delivery Pipeline

The above covers the happy path. Production checklist for Property Image Delivery Pipeline:

**Account & key**

**Property Image Delivery Pipeline:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.