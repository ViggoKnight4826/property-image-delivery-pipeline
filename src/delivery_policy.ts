import { z } from "zod";

export const propertyImageSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("maintenance_request"),
    image: z.string().min(1),
    urgent: z.boolean().default(false)
  }),
  z.object({
    kind: z.literal("tenant_document"),
    image: z.string().min(1),
    documentType: z.enum(["lease", "identity", "insurance"])
  }),
  z.object({
    kind: z.literal("inspection_reminder"),
    image: z.string().min(1),
    inspectionDate: z.string().date()
  })
]);

export type PropertyImage = z.infer<typeof propertyImageSchema>;

export type DeliveryDecision = {
  queue: "priority" | "standard";
  cacheControl: "private, no-store" | "public, max-age=86400";
  reason: string;
};

export function decideDelivery(input: PropertyImage): DeliveryDecision {
  if (input.kind === "tenant_document") {
    return {
      queue: "priority",
      cacheControl: "private, no-store",
      reason: "Tenant documents stay out of shared caches"
    };
  }

  if (input.kind === "maintenance_request" && input.urgent) {
    return {
      queue: "priority",
      cacheControl: "public, max-age=86400",
      reason: "Urgent maintenance evidence is prepared first"
    };
  }

  return {
    queue: "standard",
    cacheControl: "public, max-age=86400",
    reason: "Routine property imagery follows standard delivery"
  };
}
