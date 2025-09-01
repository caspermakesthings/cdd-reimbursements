// Optional demo seeder script
// Run with: npx tsx scripts/seed-demo.ts

import { generateReimbursementId, formatDate } from '../lib/utils'
import { ReimbursementRecord } from '../types'

function generateDemoData(): ReimbursementRecord[] {
  const demoRecords: ReimbursementRecord[] = [
    {
      id: generateReimbursementId(),
      merchant: "Starbucks Coffee",
      amount: 15.99,
      currency: "CAD",
      date: "2024-01-15",
      category: "Meals",
      projectOrClient: "Client ABC",
      paymentMethod: "Personal card",
      paidBy: "Me",
      approverEmail: "manager@company.com",
      notes: "Coffee meeting with client to discuss project requirements",
      submissionDate: new Date().toISOString(),
      subtotal: 15.99,
      tax: 0,
      total: 15.99,
      receiptFilename: "starbucks-receipt.jpg",
      pdfFilename: "RIMB-20240115-ABC1.pdf"
    },
    {
      id: generateReimbursementId(),
      merchant: "Uber Technologies",
      amount: 32.50,
      currency: "CAD",
      date: "2024-01-16",
      category: "Travel",
      projectOrClient: "Office Visit",
      paymentMethod: "Company card",
      paidBy: "Company",
      approverEmail: "",
      notes: "Transportation to quarterly all-hands meeting",
      submissionDate: new Date().toISOString(),
      subtotal: 32.50,
      tax: 0,
      total: 32.50,
      receiptFilename: "uber-receipt.pdf",
      pdfFilename: "RIMB-20240116-XYZ2.pdf"
    }
  ]

  return demoRecords
}

// Example usage
console.log("Demo reimbursement records:")
console.log(JSON.stringify(generateDemoData(), null, 2))

export { generateDemoData }