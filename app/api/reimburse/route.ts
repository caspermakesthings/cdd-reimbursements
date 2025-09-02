import { NextRequest, NextResponse } from "next/server"
import { reimbursementSchema, fileSchema } from "@/lib/schema"
import { generateReimbursementId } from "@/lib/utils"
import { buildCoverPage, mergeWithReceipt } from "@/lib/pdf"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    
    // Extract and validate form fields
    const formFields = {
      merchant: formData.get('merchant'),
      total: formData.get('total'),
      tax: formData.get('tax'),
      tip: formData.get('tip'),
      currency: formData.get('currency'),
      date: formData.get('date'),
      category: formData.get('category'),
      subcategory: formData.get('subcategory'),
      projectOrClient: formData.get('projectOrClient'),
      paymentMethod: formData.get('paymentMethod'),
      paidBy: formData.get('paidBy'),
      approverEmail: formData.get('approverEmail'),
      businessPurpose: formData.get('businessPurpose'),
      attendees: formData.get('attendees'),
      exchangeRate: formData.get('exchangeRate'),
      exchangeRateDate: formData.get('exchangeRateDate'),
      receiptAttached: formData.get('receiptAttached') === 'true',
      startLocation: formData.get('startLocation'),
      endLocation: formData.get('endLocation'),
      milesDriven: formData.get('milesDriven'),
      mileageRate: formData.get('mileageRate'),
      notes: formData.get('notes'),
    }
    
    const receiptFile = formData.get('receipt') as File
    
    // Validate form data
    const validatedFields = reimbursementSchema.parse(formFields)
    
    // Validate file
    if (!receiptFile || receiptFile.size === 0) {
      return NextResponse.json(
        { error: "Receipt file is required" },
        { status: 400 }
      )
    }
    
    const validatedFile = fileSchema.parse({
      name: receiptFile.name,
      size: receiptFile.size,
      type: receiptFile.type
    })
    
    // Generate ID and use provided totals
    const id = generateReimbursementId()
    const tax = validatedFields.tax || 0
    const tip = validatedFields.tip || 0
    const subtotal = validatedFields.total - tax - tip
    
    const totals = { 
      subtotal, 
      tax, 
      tip,
      total: validatedFields.total 
    }
    
    // Generate cover page PDF
    const coverPdfBytes = await buildCoverPage(validatedFields, totals, id)
    
    // Merge with receipt
    const combinedPdfBuffer = await mergeWithReceipt(coverPdfBytes, receiptFile)
    
    return new NextResponse(combinedPdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}.pdf"`
      }
    })
    
  } catch (error: any) {
    console.error("Reimbursement processing error:", error)
    
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