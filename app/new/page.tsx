import Link from "next/link"
import { Button } from "@/components/ui/button"
import ReimbursementForm from "@/components/ReimbursementForm"
import { ArrowLeft } from "lucide-react"

export default function NewReimbursementPage() {
  return (
    <div className="min-h-screen bg-slate-50 md:bg-slate-50">
      {/* Mobile-First Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-3 md:max-w-6xl md:mx-auto md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Back Button */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 -ml-2 md:ml-0">
                <ArrowLeft className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Back to Home</span>
              </Button>
            </Link>
            
            {/* Center Title on Mobile */}
            <div className="flex items-center space-x-2 md:space-x-3 absolute left-1/2 transform -translate-x-1/2 md:relative md:left-auto md:transform-none">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-slate-900 rounded flex items-center justify-center">
                <span className="text-white text-xs md:text-sm font-bold">C</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-slate-900">CDD Ltd.</h1>
                <p className="text-sm text-slate-600">New Age Research Solutions</p>
              </div>
            </div>
            
            {/* Spacer for mobile */}
            <div className="w-12 md:w-0"></div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Optimized */}
      <main className="pb-safe">
        {/* Mobile Title Section */}
        <div className="px-4 pt-6 pb-4 md:hidden">
          <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">
            New Reimbursement
          </h2>
          <p className="text-sm text-slate-600 text-center px-4">
            Fill out the form to generate your PDF
          </p>
        </div>

        {/* Desktop Title Section */}
        <div className="hidden md:block max-w-4xl mx-auto px-6 pt-12 pb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              New Reimbursement Request
            </h2>
            <p className="text-lg text-slate-600">
              Complete the form below to generate a professional reimbursement PDF
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="px-0 md:max-w-4xl md:mx-auto md:px-6 md:pb-12">
          <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-slate-200 md:p-8">
            <ReimbursementForm />
          </div>
        </div>
      </main>
    </div>
  )
}