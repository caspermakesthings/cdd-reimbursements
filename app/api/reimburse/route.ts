import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { reimbursementSchema, fileSchema } from "@/lib/schema"
import { generateReimbursementId, getYearMonth, getCurrentTimestamp } from "@/lib/utils"
import { buildCoverPage, mergeWithReceipt } from "@/lib/pdf"
import { getClientForUser, uploadReimbursementFiles } from "@/lib/onedrive"
import { ReimbursementApiResponse, ReimbursementRecord } from "@/types"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    const formData = await request.formData()
    
    // Extract and validate form fields
    const formFields = {
      merchant: formData.get('merchant'),
      amount: formData.get('amount'),
      currency: formData.get('currency'),
      date: formData.get('date'),
      category: formData.get('category'),
      projectOrClient: formData.get('projectOrClient'),
      paymentMethod: formData.get('paymentMethod'),
      paidBy: formData.get('paidBy'),
      approverEmail: formData.get('approverEmail'),
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
    
    // Generate ID and calculate totals
    const id = generateReimbursementId()
    const subtotal = validatedFields.amount
    const tax = 0 // MVP: no tax calculation
    const total = subtotal + tax
    
    const totals = { subtotal, tax, total }
    
    // Generate cover page PDF
    const coverPdfBytes = await buildCoverPage(validatedFields, totals, id)
    
    // Merge with receipt
    const combinedPdfBuffer = await mergeWithReceipt(coverPdfBytes, receiptFile)
    
    // Check if OneDrive is connected
    const client = session ? getClientForUser(session) : null
    const isConnected = client !== null
    
    if (isConnected && client) {
      try {
        // Upload to OneDrive with organized folder structure
        const { year, month } = getYearMonth(validatedFields.date)
        const basePath = process.env.ONEDRIVE_BASE_FOLDER || "/Documents/Reimbursements"
        
        // Create record for JSON storage
        const record: ReimbursementRecord = {
          ...validatedFields,
          id,
          submissionDate: getCurrentTimestamp(),
          subtotal,
          tax,
          total,
          receiptFilename: receiptFile.name,
          pdfFilename: `${id}.pdf`
        }
        
        // Upload all files using the new organized approach
        const { pdfResult, supportingPath } = await uploadReimbursementFiles(
          client,
          basePath,
          year,
          month,
          id,
          combinedPdfBuffer,
          receiptFile,
          record
        )
        
        const response: ReimbursementApiResponse = {
          status: "uploaded",
          id,
          webUrl: pdfResult.webUrl,
          path: `${basePath}/${year}/${month}/PDFs/${id}.pdf`
        }
        
        return NextResponse.json(response)
        
      } catch (oneDriveError) {
        console.error("OneDrive upload failed:", oneDriveError)
        // Fall back to download if OneDrive fails
      }
    }
    
    // Return PDF for download
    const response: ReimbursementApiResponse = {
      status: "download",
      id
    }
    
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