// Optional demo seeder script
// Run with: npx tsx scripts/seed-demo.ts

import { generateReimbursementId, formatDate } from '../lib/utils'
import { ReimbursementRecord } from '../types'

function generateDemoData(): ReimbursementRecord[] {
  const demoRecords: ReimbursementRecord[] = [
    {
      id: generateReimbursementId(),
      merchant: "Starbucks Coffee",
      total: 15.99,
      tax: 0,
      currency: "CAD",
      date: "2024-01-15",
      category: "Meals & Entertainment",
      projectOrClient: "Client ABC",
      paymentMethod: "Credit Card - Ending: 8680",
      paidBy: "Me",
      approverEmail: "manager@company.com",
      businessPurpose: "Coffee meeting with client to discuss project requirements",
      notes: "Discussed Q1 project milestones",
      receiptAttached: true,
      submissionDate: new Date().toISOString(),
      receiptFilename: "starbucks-receipt.jpg",
      pdfFilename: "RIMB-20240115-ABC1.pdf"
    },
    {
      id: generateReimbursementId(),
      merchant: "Uber Technologies",
      total: 32.50,
      tax: 0,
      currency: "CAD",
      date: "2024-01-16",
      category: "Travel",
      projectOrClient: "Office Visit",
      paymentMethod: "Company card",
      paidBy: "Company",
      approverEmail: "",
      businessPurpose: "Transportation to quarterly all-hands meeting",
      notes: "From downtown office to conference center",
      receiptAttached: true,
      submissionDate: new Date().toISOString(),
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