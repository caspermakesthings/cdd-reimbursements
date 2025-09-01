# CDD Reimbursements

A Next.js 14 application for submitting standardized reimbursement forms with automatic PDF generation and OneDrive integration.

## Features

- **Standardized Forms**: Submit reimbursement requests with all required fields
- **PDF Generation**: Automatic creation of professional PDFs with cover pages and attached receipts
- **OneDrive Integration**: Seamless upload and organization by year/month when connected
- **File Support**: Handles JPG, PNG, HEIC, and PDF receipt formats
- **Form Validation**: Comprehensive validation with user-friendly error messages
- **Responsive Design**: Built with TailwindCSS and shadcn/ui components

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Azure App Registration (for OneDrive integration)

### Installation

1. Clone and install dependencies:
```bash
npx create-next-app@latest cdd-reimbursements --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd cdd-reimbursements
pnpm install
```

2. Set up shadcn/ui:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label select textarea form toast
```

3. Copy the project files to your directory

4. Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```

### Azure App Registration Setup

1. **Create App Registration**:
   - Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "CDD Reimbursements"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web → `http://localhost:3000/api/auth/callback/azure-ad`

2. **Configure API Permissions**:
   - Go to "API permissions"
   - Add permissions → Microsoft Graph → Delegated permissions
   - Add: `Files.ReadWrite`, `offline_access`, `openid`, `email`, `profile`
   - Grant admin consent (if required)

3. **Create Client Secret**:
   - Go to "Certificates & secrets"
   - New client secret
   - Copy the secret value immediately

4. **Update Environment Variables**:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-here
   AZURE_AD_CLIENT_ID=your-application-id
   AZURE_AD_CLIENT_SECRET=your-client-secret
   AZURE_AD_TENANT_ID=common
   ONEDRIVE_BASE_FOLDER=/Documents/Reimbursements
   ```

### Development

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production

```bash
pnpm build
pnpm start
```

## Usage

### Without OneDrive Connection
1. Navigate to `/new`
2. Fill out the reimbursement form
3. Upload a receipt file
4. Click "Submit & Download PDF"
5. Your browser will download the combined PDF

### With OneDrive Connection
1. Click "Connect OneDrive" on the home page
2. Sign in with your Microsoft account
3. Submit a reimbursement request
4. Files are automatically organized in `/Documents/Reimbursements/YYYY/MM/`

## File Organization

When connected to OneDrive, files are organized for better management:
```
/Documents/Reimbursements/
├── 2024/
│   ├── 01/
│   │   ├── PDFs/                         # Final reimbursement PDFs
│   │   │   ├── RIMB-20240115-A1B2.pdf
│   │   │   └── RIMB-20240116-C3D4.pdf
│   │   └── Supporting/                   # Metadata + raw receipts  
│   │       ├── RIMB-20240115-A1B2.json
│   │       ├── RIMB-20240115-A1B2-receipt.jpg
│   │       ├── RIMB-20240116-C3D4.json
│   │       └── RIMB-20240116-C3D4-receipt.pdf
│   └── 02/
└── 2025/
```

**Benefits of this organization:**
- **PDFs folder**: Clean view of all final reimbursement documents
- **Supporting folder**: Raw receipts and JSON metadata kept separate
- **Easy navigation**: Quickly find what you need without clutter
- **Audit trail**: Complete record of all submission data and original receipts

## API Endpoints

- `GET /api/drive/status` - Check OneDrive connection status
- `POST /api/reimburse` - Submit reimbursement (form-data with receipt file)
- `GET/POST /api/auth/[...nextauth]` - NextAuth authentication

## Example API Responses

### Connected Mode (OneDrive Upload)
```json
{
  "status": "uploaded",
  "id": "RIMB-20240115-A1B2",
  "webUrl": "https://...",
  "path": "/Documents/Reimbursements/2024/01/RIMB-20240115-A1B2.pdf"
}
```

### Not Connected Mode (PDF Download)
- Returns PDF file with `Content-Disposition: attachment`
- Filename: `{id}.pdf`

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Authentication**: NextAuth.js with Azure AD
- **PDF Generation**: pdf-lib
- **File Upload**: Microsoft Graph API
- **Form Handling**: react-hook-form + zod
- **UI Components**: Radix UI primitives

## Security Features

- File size limit: 10MB
- Supported file types: JPG, PNG, HEIC, PDF
- Server-side validation with zod
- Secure token handling via NextAuth
- No client-side storage of sensitive data

## Development Notes

- HEIC files require conversion or will show friendly error message
- PDF generation uses pdf-lib for professional formatting
- OneDrive integration handles folder creation automatically
- Form validation provides real-time feedback
- Toast notifications for user feedback

## Troubleshooting

### OneDrive Connection Issues
- Verify Azure app registration permissions
- Check redirect URI matches exactly
- Ensure client secret hasn't expired

### PDF Generation Issues
- Check file size (must be < 10MB)
- Verify supported file formats
- Ensure receipt file is properly attached

### Development Issues
- Run `pnpm install` if dependencies are missing
- Check `.env.local` file configuration
- Verify Azure AD app registration settings

## License

MIT