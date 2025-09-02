import { NextRequest, NextResponse } from "next/server"
import { reimbursementSchema, fileSchema } from "@/lib/schema"
import { generateReimbursementId } from "@/lib/utils"
import { buildBatchCoverPage, mergeWithMultipleReceipts } from "@/lib/pdf"

// Route segment config for handling large requests
export const runtime = 'nodejs'
export const maxDuration = 120 // 120 seconds timeout for large batches
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    
    // Validate that we have the required fields
    if (!formData.has('totalExpenses')) {
      return NextResponse.json(
        { error: "Missing totalExpenses field" },
        { status: 400 }
      )
    }
    
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
      
      // Parse JSON expense data with better error handling
      let parsedExpense
      try {
        parsedExpense = JSON.parse(expenseData as string)
      } catch (parseError) {
        console.error(`JSON parse error for expense ${i + 1}:`, parseError)
        return NextResponse.json(
          { 
            error: `Invalid JSON data for expense ${i + 1}`,
            details: `Failed to parse expense data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
          },
          { status: 400 }
        )
      }
      
      // Remove internal fields that aren't part of the schema
      const { id, receiptFile: _, ...expenseFields } = parsedExpense
      
      // Validate expense data
      try {
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
      } catch (validationError: any) {
        console.error(`Validation error for expense ${i + 1}:`, validationError)
        return NextResponse.json(
          { 
            error: `Validation failed for expense ${i + 1}`,
            details: validationError.errors || validationError.message
          },
          { status: 400 }
        )
      }
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
    
    // Handle specific error types
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    // Handle request size errors
    if (error.message && error.message.includes('Request Entity Too Large')) {
      return NextResponse.json(
        { 
          error: "Request too large",
          details: "The batch request exceeds the maximum allowed size (50MB). Try reducing file sizes or splitting into smaller batches."
        },
        { status: 413 }
      )
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        { 
          error: "Invalid JSON data",
          details: "The request contains malformed JSON data"
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    )
  }
}
