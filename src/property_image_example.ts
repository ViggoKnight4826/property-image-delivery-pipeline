import { decideDelivery, propertyImageSchema } from "./delivery_policy.js";

const examples = [
  { kind: "maintenance_request", image: "https://assets.example.test/leak.jpg", urgent: true },
  { kind: "tenant_document", image: "https://assets.example.test/lease.png", documentType: "lease" },
  { kind: "inspection_reminder", image: "https://assets.example.test/unit-4.jpg", inspectionDate: "2026-09-18" }
] as const;

for (const candidate of examples) {
  const propertyImage = propertyImageSchema.parse(candidate);
  console.log(propertyImage.kind, decideDelivery(propertyImage));
}
