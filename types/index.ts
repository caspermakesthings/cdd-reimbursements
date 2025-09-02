export type Currency = "CAD" | "USD" | "EUR" | "GBP"

export type Category = "Meals & Entertainment" | "Travel" | "Office Supplies" | "Professional Services" | "Other"

export type PaymentMethod = "Credit Card - Ending: 8680" | "Debit Card - Ending: 7923" | "Credit Card - Ending: 8476" | "Company card" | "Cash"

export type PaidBy = "Me" | "Company"

export interface ReimbursementFormData {
  merchant: string
  total: number
  tax?: number
  tip?: number
  currency: Currency
  date: string
  category: Category
  subcategory?: string
  projectOrClient?: string
  paymentMethod: PaymentMethod
  paidBy: PaidBy
  approverEmail?: string
  businessPurpose: string
  attendees?: string
  exchangeRate?: number
  exchangeRateDate?: string
  receiptAttached: boolean
  startLocation?: string
  endLocation?: string
  milesDriven?: number
  mileageRate?: number
  notes?: string
}

export interface ReimbursementRecord extends ReimbursementFormData {
  id: string
  submissionDate: string
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

export interface BatchReimbursementData {
  items: ReimbursementFormData[]
  eventDescription?: string  // Optional description for the entire batch (e.g., "Q4 Planning Meeting with ViewSonic")
  totalAmount?: number  // Total of all reimbursements
}

export interface DriveStatusResponse {
  connected: boolean
}

export const CURRENCIES: Currency[] = ["CAD", "USD", "EUR", "GBP"]

export const CATEGORIES: Category[] = ["Meals & Entertainment", "Travel", "Office Supplies", "Professional Services", "Other"]

export const PAYMENT_METHODS: PaymentMethod[] = ["Credit Card - Ending: 8680", "Debit Card - Ending: 7923", "Credit Card - Ending: 8476", "Company card", "Cash"]

export const PAID_BY_OPTIONS: PaidBy[] = ["Me", "Company"]