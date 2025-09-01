import { Client, AuthenticationProvider } from "@microsoft/microsoft-graph-client"
import { Session } from "next-auth"
import { OneDriveUploadResult, ReimbursementRecord } from "@/types"

class SessionAuthProvider implements AuthenticationProvider {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  public async getAccessToken(): Promise<string> {
    return this.accessToken
  }
}

export function getClientForUser(session: Session): Client | null {
  if (!session?.accessToken) {
    return null
  }

  try {
    const authProvider = new SessionAuthProvider(session.accessToken)
    return Client.initWithMiddleware({ authProvider })
  } catch (error) {
    console.error("Failed to initialize Graph client:", error)
    return null
  }
}

async function createFolderIfNotExists(
  client: Client,
  parentFolderId: string,
  folderName: string
): Promise<string> {
  try {
    // Try to find existing folder
    const existingFolders = await client.api(`/me/drive/items/${parentFolderId}/children`)
      .filter(`name eq '${folderName}' and folder ne null`).get()
    
    if (existingFolders.value && existingFolders.value.length > 0) {
      return existingFolders.value[0].id
    }
    
    // Create new folder
    const newFolder = await client.api(`/me/drive/items/${parentFolderId}/children`).post({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "replace"
    })
    
    return newFolder.id
  } catch (error: any) {
    console.error(`Failed to create folder '${folderName}':`, error)
    throw error
  }
}

export async function ensureFolderStructure(
  client: Client,
  basePath: string = "/Documents/Reimbursements",
  year: string,
  month: string
): Promise<{ pdfFolderId: string; supportingFolderId: string }> {
  try {
    // Start from Documents folder
    const documentsFolder = await client.api("/me/drive/root:/Documents").get()
    
    // Create/get Reimbursements folder
    const reimbursementsFolderId = await createFolderIfNotExists(
      client, documentsFolder.id, "Reimbursements"
    )
    
    // Create/get Year folder
    const yearFolderId = await createFolderIfNotExists(
      client, reimbursementsFolderId, year
    )
    
    // Create/get Month folder
    const monthFolderId = await createFolderIfNotExists(
      client, yearFolderId, month
    )
    
    // Create/get PDFs subfolder
    const pdfFolderId = await createFolderIfNotExists(
      client, monthFolderId, "PDFs"
    )
    
    // Create/get Supporting subfolder
    const supportingFolderId = await createFolderIfNotExists(
      client, monthFolderId, "Supporting"
    )
    
    return { pdfFolderId, supportingFolderId }
  } catch (error: any) {
    console.error("Failed to ensure folder structure:", error)
    throw error
  }
}

// Legacy function for backward compatibility
export async function ensureFolder(
  client: Client,
  basePath: string = "/Documents/Reimbursements",
  year: string,
  month: string
): Promise<string> {
  const { pdfFolderId } = await ensureFolderStructure(client, basePath, year, month)
  return pdfFolderId
}

export async function uploadFile(
  client: Client,
  folderId: string,
  filename: string,
  bytes: Buffer
): Promise<OneDriveUploadResult> {
  try {
    const result = await client.api(`/me/drive/items/${folderId}:/${filename}:/content`).put(bytes)
    
    return {
      id: result.id,
      webUrl: result.webUrl
    }
  } catch (error: any) {
    console.error("Failed to upload file to OneDrive:", {
      filename,
      error: error.message,
      code: error.code
    })
    throw error
  }
}

export async function uploadBytesByPath(
  client: Client,
  path: string,
  bytes: Buffer
): Promise<OneDriveUploadResult> {
  const result = await client.api(`/me/drive/root:${path}:/content`).put(bytes)
  
  return {
    id: result.id,
    webUrl: result.webUrl
  }
}

export async function appendJsonRecord(
  client: Client,
  folderId: string,
  record: ReimbursementRecord
): Promise<void> {
  try {
    const jsonContent = JSON.stringify(record, null, 2)
    const jsonBytes = Buffer.from(jsonContent, 'utf-8')
    
    await client.api(`/me/drive/items/${folderId}:/${record.id}.json:/content`).put(jsonBytes)
  } catch (error: any) {
    console.error("Failed to upload JSON record:", {
      recordId: record.id,
      error: error.message,
      code: error.code
    })
    throw error
  }
}

export async function uploadReimbursementFiles(
  client: Client,
  basePath: string = "/Documents/Reimbursements",
  year: string,
  month: string,
  reimbursementId: string,
  combinedPdfBuffer: Buffer,
  receiptFile: File,
  record: ReimbursementRecord
): Promise<{ pdfResult: OneDriveUploadResult; supportingPath: string }> {
  try {
    // Ensure folder structure exists
    const { pdfFolderId, supportingFolderId } = await ensureFolderStructure(
      client, basePath, year, month
    )
    
    // Upload combined PDF to PDFs folder
    const pdfResult = await uploadFile(
      client,
      pdfFolderId,
      `${reimbursementId}.pdf`,
      combinedPdfBuffer
    )
    
    // Upload raw receipt to Supporting folder
    const receiptBytes = Buffer.from(await receiptFile.arrayBuffer())
    const receiptExtension = receiptFile.name.split('.').pop() || 'unknown'
    const rawReceiptFilename = `${reimbursementId}-receipt.${receiptExtension}`
    
    await uploadFile(
      client,
      supportingFolderId,
      rawReceiptFilename,
      receiptBytes
    )
    
    // Upload JSON record to Supporting folder
    await appendJsonRecord(client, supportingFolderId, {
      ...record,
      rawReceiptFilename
    })
    
    const supportingPath = `${basePath}/${year}/${month}/Supporting/`
    
    return { pdfResult, supportingPath }
  } catch (error: any) {
    console.error("Failed to upload reimbursement files:", {
      reimbursementId,
      error: error.message,
      code: error.code
    })
    throw error
  }
}

export async function isConnected(session: Session | null): Promise<boolean> {
  if (!session?.accessToken || session.error === "RefreshAccessTokenError") {
    return false
  }

  try {
    const client = getClientForUser(session)
    if (!client) {
      return false
    }
    
    // Simple test to check if we can access the user's drive
    const drive = await client.api('/me/drive').get()
    return !!(drive && drive.id)
  } catch (error: any) {
    // Log specific error details for debugging
    console.error("OneDrive connection test failed:", {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    })
    return false
  }
}