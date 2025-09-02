import { NextRequest, NextResponse } from "next/server"
import { reimbursementSchema, fileSchema } from "@/lib/schema"
import { generateReimbursementId } from "@/lib/utils"
import { buildBatchCoverPage, mergeWithMultipleReceipts } from "@/lib/pdf"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    
    const totalExpenses = parseInt(formData.get('totalExpenses') as string || '0')
    const eventDescription = formData.get('eventDescription') as string || ''
    
    if (totalExpenses === 0) {
      return NextResponse.json(
        { error: "No expenses provided" },
        { status: 400 }
      )
    }
    
    const expenses = []
    const receiptFiles = []
    
    // Parse and validate each expense
    for (let i = 0; i < totalExpenses; i++) {
      const expenseData = formData.get(`expense_${i}`)
      const receiptFile = formData.get(`receipt_${i}`) as File
      
      if (!expenseData) {
        return NextResponse.json(
          { error: `Missing expense data for item ${i + 1}` },
          { status: 400 }
        )
      }
      
      if (!receiptFile || receiptFile.size === 0) {
        return NextResponse.json(
          { error: `Missing receipt for expense ${i + 1}` },
          { status: 400 }
        )
      }
      
      // Parse JSON expense data
      const parsedExpense = JSON.parse(expenseData as string)
      
      // Remove internal fields that aren't part of the schema
      const { id, receiptFile: _, ...expenseFields } = parsedExpense
      
      // Validate expense data
      const validatedExpense = reimbursementSchema.parse(expenseFields)
      
      // Validate receipt file
      const validatedFile = fileSchema.parse({
        name: receiptFile.name,
        size: receiptFile.size,
        type: receiptFile.type
      })
      
      expenses.push({
        ...validatedExpense,
        // Calculate individual totals
        subtotal: validatedExpense.total - (validatedExpense.tax || 0) - (validatedExpense.tip || 0)
      })
      receiptFiles.push(receiptFile)
    }
    
    // Generate batch ID
    const batchId = generateReimbursementId()
    
    // Calculate total amounts
    const totalAmount = expenses.reduce((sum, exp) => {
      // Convert to USD if exchange rate is provided
      const amount = exp.currency !== 'USD' && exp.exchangeRate 
        ? exp.total / exp.exchangeRate 
        : exp.total
      return sum + amount
    }, 0)
    
    // Generate batch cover page PDF
    const coverPdfBytes = await buildBatchCoverPage(
      expenses,
      receiptFiles,
      batchId,
      eventDescription,
      totalAmount
    )
    
    // Merge with all receipts
    const combinedPdfBuffer = await mergeWithMultipleReceipts(
      coverPdfBytes,
      receiptFiles
    )
    
    return new NextResponse(combinedPdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="batch-${batchId}.pdf"`
      }
    })
    
  } catch (error: any) {
    console.error("Batch reimbursement processing error:", error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
