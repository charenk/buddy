import { z } from 'zod';

// Figma webhook payload (simplified; we validate what we use)
export const CommentEvent = z.object({
  event_type: z.string().optional(),
  file_key: z.string(),
  comment: z.object({
    id: z.string(),
    message: z.string(),
    created_at: z.string().optional(),
    resolved_at: z.string().nullable().optional(),
    user: z.any().optional(),
    client_meta: z.any().optional(),
    parent_id: z.string().nullable().optional(),
    // In many orgs, pinned comments include a node reference
    // We'll accept either pinned node in client_meta or a mention link in message
  }),
});
export type CommentEvent = z.infer<typeof CommentEvent>;
