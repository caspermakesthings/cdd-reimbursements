export type Currency = "CAD" | "USD" | "EUR" | "GBP"

export type Category = "Meals" | "Travel" | "Office" | "Software" | "Other"

export type PaymentMethod = "Personal card" | "Company card" | "Cash"

export type PaidBy = "Me" | "Company"

export interface ReimbursementFormData {
  merchant: string
  amount: number
  currency: Currency
  date: string
  category: Category
  projectOrClient?: string
  paymentMethod: PaymentMethod
  paidBy: PaidBy
  approverEmail?: string
  notes?: string
}

export interface ReimbursementRecord extends ReimbursementFormData {
  id: string
  submissionDate: string
  subtotal: number
  tax: number
  total: number
  receiptFilename: string
  pdfFilename: string
  rawReceiptFilename?: string
}

export interface OneDriveUploadResult {
  id: string
  webUrl?: string
}

export interface ReimbursementApiResponse {
  status: "uploaded" | "download"
  id: string
  webUrl?: string
  path?: string
}

export interface DriveStatusResponse {
  connected: boolean
}

export const CURRENCIES: Currency[] = ["CAD", "USD", "EUR", "GBP"]

export const CATEGORIES: Category[] = ["Meals", "Travel", "Office", "Software", "Other"]

export const PAYMENT_METHODS: PaymentMethod[] = ["Personal card", "Company card", "Cash"]

export const PAID_BY_OPTIONS: PaidBy[] = ["Me", "Company"]