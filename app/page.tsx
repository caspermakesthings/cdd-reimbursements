import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-3 md:max-w-6xl md:mx-auto md:px-6 md:py-4">
          <div className="flex items-center justify-center md:justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-slate-900">CDD Ltd.</h1>
                <p className="text-xs md:text-sm text-slate-600 hidden sm:block">New Age Research Solutions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-safe">
        {/* Mobile-first Hero */}
        <div className="px-4 pt-8 pb-6 md:max-w-6xl md:mx-auto md:px-6 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            {/* Page Header */}
            <div className="mb-8 md:mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-3 md:mb-4 leading-tight">
                Expense Reimbursements
              </h2>
              <p className="text-base md:text-lg text-slate-600 px-2 md:px-0">
                Professional PDF generation for expense reports
              </p>
            </div>

            {/* Main Action - Mobile Optimized */}
            <div className="mb-8 md:mb-8">
              <Link href="/new">
                <Button size="lg" className="w-full h-14 md:h-12 text-lg md:text-base font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl md:rounded-lg shadow-lg active:scale-95 transition-all duration-150">
                  Create New Reimbursement
                </Button>
              </Link>
            </div>

            {/* Features - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-slate-700 text-lg">📄</span>
                </div>
                <h3 className="font-medium text-slate-900 mb-2 text-sm md:text-base">Professional PDFs</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Generate formatted reports with receipts
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-slate-700 text-lg">📱</span>
                </div>
                <h3 className="font-medium text-slate-900 mb-2 text-sm md:text-base">Photo Selection</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Select receipts from your photo library
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm sm:col-span-1 col-span-1">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-slate-700 text-lg">✓</span>
                </div>
                <h3 className="font-medium text-slate-900 mb-2 text-sm md:text-base">Form Validation</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Built-in field validation and checking
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Hidden on mobile, shown on desktop */}
      <footer className="hidden md:block bg-white border-t border-slate-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} CDD Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}