import { z } from 'zod';

export const SubmitComplaintSchema = z.object({
  body: z.object({
    pharmacy_name: z.string().min(1).max(200),
    issue:         z.string().min(3).max(300),
    description:   z.string().min(10).max(3000),
    category:      z.enum(['Location Issue', 'Service Issue', 'Medicine Availability', 'General Feedback', 'Other']).optional().default('Other'),
    attachments_count: z.number().int().min(0).max(10).optional().default(0),
  }),
});

export const ListComplaintsSchema = z.object({
  query: z.object({
    status:   z.enum(['New', 'Under Review', 'Resolved', 'Closed']).optional(),
    priority: z.enum(['High', 'Medium', 'Low']).optional(),
    page:     z.string().transform(Number).optional().default('1'),
    limit:    z.string().transform(Number).optional().default('20'),
  }),
});

export const ComplaintIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid complaint ID') }),
});

export const RespondComplaintSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid complaint ID') }),
  body: z.object({
    response: z.string().min(1).max(2000),
    status:   z.enum(['Under Review', 'Resolved', 'Closed']).optional(),
    priority: z.enum(['High', 'Medium', 'Low']).nullable().optional(),
  }),
});

export const UpdateComplaintStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid complaint ID') }),
  body: z.object({
    status:   z.enum(['Under Review', 'Resolved', 'Closed']),
    priority: z.enum(['High', 'Medium', 'Low']).nullable().optional(),
  }),
});
