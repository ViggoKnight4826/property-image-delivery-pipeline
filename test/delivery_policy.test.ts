import assert from "node:assert/strict";
import test from "node:test";
import { decideDelivery, propertyImageSchema } from "../src/delivery_policy.js";

test("tenant documents receive private priority delivery", () => {
  const document = propertyImageSchema.parse({
    kind: "tenant_document",
    image: "https://assets.example.test/lease.png",
    documentType: "lease"
  });

  assert.deepEqual(decideDelivery(document), {
    queue: "priority",
    cacheControl: "private, no-store",
    reason: "Tenant documents stay out of shared caches"
  });
});

test("routine inspection reminders use standard cached delivery", () => {
  const reminder = propertyImageSchema.parse({
    kind: "inspection_reminder",
    image: "https://assets.example.test/unit-4.jpg",
    inspectionDate: "2026-09-18"
  });

  assert.equal(decideDelivery(reminder).queue, "standard");
  assert.equal(decideDelivery(reminder).cacheControl, "public, max-age=86400");
});
