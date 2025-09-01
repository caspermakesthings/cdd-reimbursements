import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { ReimbursementFormData } from "@/lib/schema"
import { formatCurrency, formatDate } from "@/lib/utils"

interface PdfTotals {
  subtotal: number
  tax: number
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
  
  // Left column
  drawField('Merchant', formData.merchant, leftX, yPos)
  yPos -= lineHeight
  drawField('Category', formData.category, leftX, yPos)
  yPos -= lineHeight
  drawField('Date', formatDate(formData.date), leftX, yPos)
  yPos -= lineHeight
  drawField('Payment', formData.paymentMethod, leftX, yPos)
  yPos -= lineHeight
  drawField('Paid By', formData.paidBy, leftX, yPos)
  
  // Right column
  yPos = height - 180
  if (formData.projectOrClient) {
    drawField('Project', formData.projectOrClient, rightX, yPos)
    yPos -= lineHeight
  }
  
  if (formData.approverEmail) {
    drawField('Approver', formData.approverEmail, rightX, yPos)
    yPos -= lineHeight
  }
  
  // Totals Box
  const boxY = height - 350
  const boxHeight = 80
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
  
  // Totals content
  const totalsX = width - boxWidth - 40
  page.drawText(`Subtotal: ${formatCurrency(totals.subtotal, formData.currency)}`, {
    x: totalsX,
    y: boxY + 40,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })
  
  page.drawText(`Tax: ${formatCurrency(totals.tax, formData.currency)}`, {
    x: totalsX,
    y: boxY + 25,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })
  
  page.drawText(`Total: ${formatCurrency(totals.total, formData.currency)}`, {
    x: totalsX,
    y: boxY + 8,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0)
  })
  
  // Notes section
  if (formData.notes && formData.notes.trim()) {
    page.drawText('NOTES:', {
      x: 50,
      y: height - 400,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    })
    
    const words = formData.notes.trim().split(' ')
    let line = ''
    let notesY = height - 425
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      if (testLine.length > 80) {
        page.drawText(line, {
          x: 50,
          y: notesY,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        })
        line = word
        notesY -= 15
      } else {
        line = testLine
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: 50,
        y: notesY,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      })
    }
  }
  
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