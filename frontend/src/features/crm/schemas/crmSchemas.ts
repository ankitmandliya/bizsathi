import { z } from 'zod';

export const leadFormSchema = z.object({
  name: z.string().min(1, 'Lead name is required'),
  company: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  job_title: z.string().optional(),
  website: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  industry: z.string().optional(),
  estimated_value: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

export const dealFormSchema = z.object({
  title: z.string().min(1, 'Deal title is required'),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  stage_id: z.string().min(1, 'Pipeline stage is required'),
  lead_id: z.string().optional(),
  customer_id: z.string().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expected_closing_date: z.string().optional(),
  notes: z.string().optional(),
});

export type DealFormData = z.infer<typeof dealFormSchema>;

export const activityFormSchema = z.object({
  type: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;
