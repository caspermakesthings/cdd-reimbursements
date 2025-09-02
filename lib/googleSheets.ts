import { google } from 'googleapis'
import { ReimbursementFormData } from './schema'

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID
const SHEET_NAME = 'Reimbursements'

// Initialize Google Sheets API
async function getGoogleSheetsClient() {
  const client = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  return google.sheets({ version: 'v4', auth: client })
}

// Initialize spreadsheet with headers
export async function initializeSpreadsheet() {
  if (!SPREADSHEET_ID) {
    console.warn('Google Sheets ID not configured')
    return false
  }

  try {
    const sheets = await getGoogleSheetsClient()
    
    // Check if sheet exists and has headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:Z1`,
    })

    // If no headers exist, add them
    if (!response.data.values || response.data.values.length === 0) {
      const headers = [
        'Submission Date',
        'Reimbursement ID', 
        'Merchant',
        'Category',
        'Subcategory',
        'Date',
        'Total Amount',
        'Tax',
        'Tip',
        'Subtotal',
        'Currency',
        'Exchange Rate',
        'Exchange Rate Date',
        'USD Equivalent',
        'Payment Method',
        'Paid By',
        'Project/Client',
        'Approver Email',
        'Business Purpose',
        'Attendees',
        'Start Location',
        'End Location', 
        'Miles Driven',
        'Mileage Rate',
        'Receipt Attached',
        'Additional Notes',
        'PDF Filename'
      ]

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:Z1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      })

      console.log('Spreadsheet initialized with headers')
    }

    return true
  } catch (error) {
    console.error('Failed to initialize spreadsheet:', error)
    return false
  }
}

// Add reimbursement record to spreadsheet
export async function addReimbursementRecord(
  formData: ReimbursementFormData, 
  reimbursementId: string,
  pdfFilename: string,
  totals: { subtotal: number; tax: number; tip: number; total: number }
) {
  if (!SPREADSHEET_ID) {
    console.warn('Google Sheets tracking disabled - GOOGLE_SHEETS_ID not configured')
    return false
  }

  try {
    const sheets = await getGoogleSheetsClient()
    
    // Calculate USD equivalent if not USD
    let usdEquivalent = formData.total
    if (formData.currency !== 'USD' && formData.exchangeRate) {
      usdEquivalent = formData.total * formData.exchangeRate
    }

    const row = [
      new Date().toISOString(), // Submission Date
      reimbursementId,
      formData.merchant,
      formData.category,
      formData.subcategory || '',
      formData.date,
      formData.total,
      formData.tax || 0,
      formData.tip || 0,
      totals.subtotal,
      formData.currency,
      formData.exchangeRate || '',
      formData.exchangeRateDate || '',
      usdEquivalent.toFixed(2),
      formData.paymentMethod,
      formData.paidBy,
      formData.projectOrClient || '',
      formData.approverEmail || '',
      formData.businessPurpose,
      formData.attendees || '',
      formData.startLocation || '',
      formData.endLocation || '',
      formData.milesDriven || '',
      formData.mileageRate || '',
      formData.receiptAttached ? 'YES' : 'NO',
      formData.notes || '',
      pdfFilename
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row]
      }
    })

    console.log(`Added reimbursement ${reimbursementId} to spreadsheet`)
    return true
  } catch (error) {
    console.error('Failed to add reimbursement to spreadsheet:', error)
    return false
  }
}

// Get reimbursement statistics
export async function getReimbursementStats() {
  if (!SPREADSHEET_ID) {
    return null
  }

  try {
    const sheets = await getGoogleSheetsClient()
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:Z1000`, // Skip header row
    })

    const rows = response.data.values || []
    
    if (rows.length === 0) {
      return {
        totalReimbursements: 0,
        totalAmount: 0,
        totalUSD: 0,
        lastSubmission: null
      }
    }

    const totalAmount = rows.reduce((sum, row) => {
      const amount = parseFloat(row[6]) || 0 // Total Amount column
      return sum + amount
    }, 0)

    const totalUSD = rows.reduce((sum, row) => {
      const usdAmount = parseFloat(row[13]) || 0 // USD Equivalent column
      return sum + usdAmount
    }, 0)

    const lastSubmission = rows[rows.length - 1][0] // Last submission date

    return {
      totalReimbursements: rows.length,
      totalAmount,
      totalUSD,
      lastSubmission
    }
  } catch (error) {
    console.error('Failed to get reimbursement stats:', error)
    return null
  }
}