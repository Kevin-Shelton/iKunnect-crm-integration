// /lib/schemas.ts
import { z } from 'zod';

export const DeskAckSchema = z.object({
  ok: z.literal(true),
  contact: z.any().nullable(),
  conversation: z.any().nullable(),
  messages: z.array(z.any()).default([]),
  suggestions: z.array(z.string()).default([]),
  counts: z.object({ messages: z.number(), suggestions: z.number() }),
});

export type DeskAck = z.infer<typeof DeskAckSchema>;

