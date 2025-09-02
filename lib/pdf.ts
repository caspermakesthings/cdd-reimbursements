import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { ReimbursementFormData } from "@/lib/schema"
import { formatCurrency, formatDate } from "@/lib/utils"

interface PdfTotals {
  subtotal: number
  tax: number
  tip: number
  total: number
}

export async function buildCoverPage(
  formData: ReimbursementFormData,
  totals: PdfTotals,
  id: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const { width, height } = page.getSize()
  
  // Header
  page.drawText('REIMBURSEMENT REQUEST', {
    x: 50,
    y: height - 80,
    size: 24,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })
  
  // ID and Date
  page.drawText(`ID: ${id}`, {
    x: 50,
    y: height - 120,
    size: 12,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3)
  })
  
  page.drawText(`Submitted: ${formatDate(new Date().toISOString().split('T')[0])}`, {
    x: 300,
    y: height - 120,
    size: 12,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3)
  })
  
  // Main Details - Left Column
  let yPos = height - 180
  const leftX = 50
  const rightX = 320
  const lineHeight = 25
  
  const drawField = (label: string, value: string, x: number, y: number) => {
    page.drawText(`${label}:`, {
      x,
      y,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    })
    
    page.drawText(value, {
      x: x + 100,
      y,
      size: 11,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    })
  }
  
  // Left column - Basic Info
  drawField('Merchant', formData.merchant, leftX, yPos)
  yPos -= lineHeight
  drawField('Category', formData.category + (formData.subcategory ? ` - ${formData.subcategory}` : ''), leftX, yPos)
  yPos -= lineHeight
  drawField('Date', formatDate(formData.date), leftX, yPos)
  yPos -= lineHeight
  drawField('Payment', formData.paymentMethod, leftX, yPos)
  yPos -= lineHeight
  drawField('Paid By', formData.paidBy, leftX, yPos)
  
  // Right column - Additional Info
  let rightColumnY = height - 180
  if (formData.projectOrClient) {
    drawField('Project', formData.projectOrClient, rightX, rightColumnY)
    rightColumnY -= lineHeight
  }
  
  if (formData.approverEmail) {
    drawField('Approver', formData.approverEmail, rightX, rightColumnY)
    rightColumnY -= lineHeight
  }

  // Currency conversion info
  if (formData.exchangeRate && formData.currency !== 'USD') {
    drawField('Exchange Rate', `1 ${formData.currency} = ${formData.exchangeRate} USD`, rightX, rightColumnY)
    rightColumnY -= lineHeight
    if (formData.exchangeRateDate) {
      drawField('Rate Date', formatDate(formData.exchangeRateDate), rightX, rightColumnY)
      rightColumnY -= lineHeight
    }
  }

  // Travel details
  if (formData.startLocation || formData.endLocation) {
    if (formData.startLocation) {
      drawField('From', formData.startLocation, rightX, rightColumnY)
      rightColumnY -= lineHeight
    }
    if (formData.endLocation) {
      drawField('To', formData.endLocation, rightX, rightColumnY)
      rightColumnY -= lineHeight
    }
    if (formData.milesDriven) {
      drawField('Miles', `${formData.milesDriven} miles`, rightX, rightColumnY)
      rightColumnY -= lineHeight
    }
    if (formData.mileageRate) {
      drawField('Rate', `$${formData.mileageRate}/mile`, rightX, rightColumnY)
      rightColumnY -= lineHeight
    }
  }
  
  // Totals Box - Position it below both columns with adequate spacing
  const leftColumnBottom = height - 180 - (5 * lineHeight) // Left column has 5 fixed fields
  const rightColumnBottom = rightColumnY - 20 // Add 20px buffer
  const lowestPoint = Math.min(leftColumnBottom, rightColumnBottom)
  
  const boxY = lowestPoint - 40 // 40px spacing above the box
  const boxHeight = 110
  const boxWidth = 200
  
  // Draw box border
  page.drawRectangle({
    x: width - boxWidth - 50,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  })
  
  // Box header
  page.drawText('TOTALS', {
    x: width - boxWidth - 30,
    y: boxY + boxHeight - 20,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })
  
  // Totals content with proper spacing
  const totalsX = width - boxWidth - 40
  const lineSpacing = 18
  let totalsY = boxY + boxHeight - 45
  
  page.drawText(`Subtotal: ${formatCurrency(totals.subtotal, formData.currency)}`, {
    x: totalsX,
    y: totalsY,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })
  
  totalsY -= lineSpacing
  page.drawText(`Tax: ${formatCurrency(totals.tax, formData.currency)}`, {
    x: totalsX,
    y: totalsY,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })
  
  totalsY -= lineSpacing
  page.drawText(`Tip: ${formatCurrency(totals.tip, formData.currency)}`, {
    x: totalsX,
    y: totalsY,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })
  
  totalsY -= lineSpacing + 2
  page.drawText(`Total: ${formatCurrency(totals.total, formData.currency)}`, {
    x: totalsX,
    y: totalsY,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })
  
  // Business Purpose section - Required (position below totals box)
  let currentY = boxY - 60 // Start 60px below the totals box
  
  // Ensure we don't go too low on the page
  if (currentY < 200) {
    // If we're running out of space, move to a second page
    const secondPage = pdfDoc.addPage([612, 792])
    currentY = height - 80 // Start near top of new page
    
    // Add continuation header
    secondPage.drawText('REIMBURSEMENT REQUEST (Continued)', {
      x: 50,
      y: currentY,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    })
    
    currentY -= 40
    
    // Switch to drawing on second page
    page = secondPage
  }
  
  page.drawText('BUSINESS PURPOSE:', {
    x: 50,
    y: currentY,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })
  
  currentY -= 20
  const drawWrappedText = (text: string, startY: number, maxWidth: number = 80) => {
    const words = text.split(' ')
    let line = ''
    let yPosition = startY
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      if (testLine.length > maxWidth) {
        if (line) {
          page.drawText(line, {
            x: 50,
            y: yPosition,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          })
          yPosition -= 15
        }
        line = word
      } else {
        line = testLine
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      })
      yPosition -= 15
    }
    
    return yPosition
  }
  
  currentY = drawWrappedText(formData.businessPurpose, currentY)
  
  // Attendees section - For meals & entertainment
  if (formData.attendees && formData.attendees.trim()) {
    currentY -= 10
    page.drawText('ATTENDEES:', {
      x: 50,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    })
    
    currentY -= 20
    currentY = drawWrappedText(formData.attendees, currentY)
  }
  
  // Receipt confirmation
  currentY -= 10
  page.drawText(`RECEIPT ATTACHED: ${formData.receiptAttached ? 'YES' : 'NO'}`, {
    x: 50,
    y: currentY,
    size: 10,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })

  // Additional notes section
  if (formData.notes && formData.notes.trim()) {
    currentY -= 25
    page.drawText('ADDITIONAL NOTES:', {
      x: 50,
      y: currentY,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    })
    
    currentY -= 20
    currentY = drawWrappedText(formData.notes, currentY)
  }

  // Compliance statement
  currentY -= 25
  page.drawText('COMPLIANCE STATEMENT:', {
    x: 50,
    y: currentY,
    size: 10,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })
  
  currentY -= 15
  const complianceText = "All reimbursements are submitted under CDD Advisors' accountable plan as defined by IRS Reg. §1.62-2. This expense was incurred for legitimate business purposes and complies with company policy."
  currentY = drawWrappedText(complianceText, currentY, 85)
  
  return pdfDoc.save()
}

export async function mergeWithReceipt(
  coverPdfBytes: Uint8Array,
  receiptFile: File
): Promise<Buffer> {
  const coverPdf = await PDFDocument.load(coverPdfBytes)
  
  if (receiptFile.type === 'application/pdf') {
    const receiptBytes = await receiptFile.arrayBuffer()
    const receiptPdf = await PDFDocument.load(receiptBytes)
    const receiptPages = await coverPdf.copyPages(receiptPdf, receiptPdf.getPageIndices())
    
    receiptPages.forEach((page) => coverPdf.addPage(page))
  } else {
    const imageBytes = await receiptFile.arrayBuffer()
    let image
    
    if (receiptFile.type === 'image/jpeg' || receiptFile.type === 'image/jpg') {
      image = await coverPdf.embedJpg(imageBytes)
    } else if (receiptFile.type === 'image/png') {
      image = await coverPdf.embedPng(imageBytes)
    } else if (receiptFile.type === 'image/heic') {
      throw new Error('HEIC files are not supported. Please convert to JPG or PNG.')
    } else {
      throw new Error(`Unsupported image type: ${receiptFile.type}`)
    }
    
    const page = coverPdf.addPage()
    const { width, height } = page.getSize()
    
    const imageAspectRatio = image.width / image.height
    const pageAspectRatio = width / height
    
    let imageWidth: number
    let imageHeight: number
    
    if (imageAspectRatio > pageAspectRatio) {
      imageWidth = width - 40 // 20px margin on each side
      imageHeight = imageWidth / imageAspectRatio
    } else {
      imageHeight = height - 40 // 20px margin on each side
      imageWidth = imageHeight * imageAspectRatio
    }
    
    const x = (width - imageWidth) / 2
    const y = (height - imageHeight) / 2
    
    page.drawImage(image, {
      x,
      y,
      width: imageWidth,
      height: imageHeight
    })
  }
  
  const mergedPdfBytes = await coverPdf.save()
  return Buffer.from(mergedPdfBytes)
}