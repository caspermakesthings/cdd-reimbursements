import { z } from "zod"

// Helper function for email validation
const validateOptionalEmail = (val: string | null | undefined): boolean => {
  const email = val || ""
  return email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Enhanced categories with subcategories for better tracking
const EXPENSE_CATEGORIES = {
  "Meals & Entertainment": ["Client Meals", "Team Meals", "Conference Meals", "Other Entertainment"],
  "Travel": ["Airfare", "Hotel", "Ground Transportation", "Parking", "Mileage"],
  "Office Supplies": ["Stationery", "Equipment", "Software", "Technology"],
  "Professional Services": ["Consulting", "Legal", "Accounting", "Marketing"],
  "Other": ["Training", "Subscriptions", "Miscellaneous"]
} as const

export const reimbursementSchema = z.object({
  merchant: z.string().min(2, "Merchant name must be at least 2 characters"),
  total: z.coerce.number().positive("Total must be greater than 0"),
  tax: z.coerce.number().min(0, "Tax cannot be negative").optional().default(0),
  tip: z.coerce.number().min(0, "Tip cannot be negative").optional().default(0),
  currency: z.enum(["CAD", "USD", "EUR", "GBP"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  category: z.enum(["Meals & Entertainment", "Travel", "Office Supplies", "Professional Services", "Other"]),
  subcategory: z.string().max(100).nullable().optional().transform(val => val || ""),
  projectOrClient: z.string().max(120).nullable().optional().transform(val => val || ""),
  paymentMethod: z.enum(["Credit Card - Ending: 8680", "Debit Card - Ending: 7923", "Credit Card - Ending: 8476", "Company card", "Cash"]),
  paidBy: z.enum(["Me", "Company"]),
  approverEmail: z.string().nullable().optional().transform(val => val || "").refine(validateOptionalEmail, {
    message: "Invalid email format"
  }),
  businessPurpose: z.string().min(10, "Business purpose must be at least 10 characters").max(500, "Business purpose must be less than 500 characters"),
  attendees: z.string().max(500, "Attendee details must be less than 500 characters").nullable().optional().transform(val => val || ""),
  exchangeRate: z.coerce.number().positive().nullable().optional(),
  exchangeRateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").nullable().optional(),
  receiptAttached: z.boolean().default(true),
  // Travel/Mileage fields
  startLocation: z.string().max(200).nullable().optional().transform(val => val || ""),
  endLocation: z.string().max(200).nullable().optional().transform(val => val || ""),
  milesDriven: z.coerce.number().min(0).nullable().optional(),
  mileageRate: z.coerce.number().min(0).nullable().optional(),
  // Additional notes
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

export { EXPENSE_CATEGORIES }