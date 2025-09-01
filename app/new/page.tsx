import Link from "next/link"
import { Button } from "@/components/ui/button"
import ReimbursementForm from "@/components/ReimbursementForm"
import { ArrowLeft } from "lucide-react"

export default function NewReimbursementPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            New Reimbursement Request
          </h1>
          <p className="text-gray-600">
            Fill out the form below and upload your receipt to generate a professional reimbursement PDF
          </p>
        </div>
      </div>

      <ReimbursementForm />
    </div>
  )
}