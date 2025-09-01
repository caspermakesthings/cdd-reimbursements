import { z } from "zod"

// Helper function for email validation
const validateOptionalEmail = (val: string | null | undefined): boolean => {
  const email = val || ""
  return email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const reimbursementSchema = z.object({
  merchant: z.string().min(2, "Merchant name must be at least 2 characters"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.enum(["CAD", "USD", "EUR", "GBP"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  category: z.enum(["Meals", "Travel", "Office", "Software", "Other"]),
  projectOrClient: z.string().max(120).nullable().optional().transform(val => val || ""),
  paymentMethod: z.enum(["Personal card", "Company card", "Cash"]),
  paidBy: z.enum(["Me", "Company"]),
  approverEmail: z.string().nullable().optional().transform(val => val || "").refine(validateOptionalEmail, {
    message: "Invalid email format"
  }),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").nullable().optional().transform(val => val || "")
})

export const fileSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024, "File size must be less than 10MB"),
  type: z.enum([
    "image/jpeg", 
    "image/jpg", 
    "image/png", 
    "image/heic", 
    "application/pdf"
  ], {
    errorMap: () => ({ message: "File must be JPG, PNG, HEIC, or PDF" })
  })
})

export type ReimbursementFormData = z.infer<typeof reimbursementSchema>