import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CDD Reimbursements
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Submit standardized reimbursement requests with automatic PDF generation
          </p>
        </div>


        {/* Main CTAs */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Submit Reimbursement
            </h3>
            <p className="text-gray-600 mb-6">
              Create a new reimbursement request with receipt attachment. 
              Get a professional PDF with cover page and receipt for easy submission.
            </p>
            <Link href="/new">
              <Button size="lg" className="w-full">
                New Reimbursement Request
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              How It Works
            </h3>
            <ul className="text-left text-gray-600 space-y-2 mb-6">
              <li>• Fill out the standardized reimbursement form</li>
              <li>• Upload or scan your receipt (image or PDF)</li>
              <li>• Get a professional PDF with cover page</li>
              <li>• Download ready for submission to finance</li>
            </ul>
            <div className="text-sm text-gray-500">
              Streamlined workflow for quick reimbursement processing
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              📄
            </div>
            <h4 className="font-semibold mb-2">Professional PDFs</h4>
            <p className="text-sm text-gray-600">
              Generated with detailed cover pages and merged receipts
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              📱
            </div>
            <h4 className="font-semibold mb-2">Receipt Scanning</h4>
            <p className="text-sm text-gray-600">
              Capture receipts directly with your device camera
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              ✅
            </div>
            <h4 className="font-semibold mb-2">Form Validation</h4>
            <p className="text-sm text-gray-600">
              Ensure all required fields and proper file formats
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}