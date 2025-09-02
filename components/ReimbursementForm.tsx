'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reimbursementSchema, ReimbursementFormData } from '@/lib/schema'
import { CURRENCIES, CATEGORIES, PAYMENT_METHODS, PAID_BY_OPTIONS } from '@/types'
import { EXPENSE_CATEGORIES } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/components/ui/use-toast'
import { useState, useEffect } from 'react'
import ReceiptScanner from '@/components/ReceiptScanner'
import { useExchangeRates, getExchangeRateToUSD, formatExchangeRate } from '@/hooks/useExchangeRates'

export default function ReimbursementForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Meals & Entertainment')
  const [showTravelFields, setShowTravelFields] = useState(false)
  const [showCurrencyFields, setShowCurrencyFields] = useState(false)
  const { toast } = useToast()
  const { rates, loading: ratesLoading, error: ratesError, lastUpdated, isUsingFallback } = useExchangeRates()

  const form = useForm<ReimbursementFormData>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: {
      merchant: '',
      total: 0,
      tax: undefined,
      tip: undefined,
      currency: 'CAD',
      date: new Date().toISOString().split('T')[0],
      category: 'Meals & Entertainment',
      subcategory: '',
      projectOrClient: '',
      paymentMethod: 'Credit Card - Ending: 8680',
      paidBy: 'Me',
      approverEmail: '',
      businessPurpose: '',
      attendees: '',
      exchangeRate: undefined,
      exchangeRateDate: undefined,
      receiptAttached: true,
      startLocation: '',
      endLocation: '',
      milesDriven: undefined,
      mileageRate: undefined,
      notes: ''
    }
  })


  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  // Watch category changes to show/hide conditional fields
  const watchedCategory = form.watch('category')
  const watchedCurrency = form.watch('currency')
  
  useEffect(() => {
    setSelectedCategory(watchedCategory)
    setShowTravelFields(watchedCategory === 'Travel')
    setShowCurrencyFields(watchedCurrency !== 'USD')
    
    // Auto-populate exchange rate when currency changes
    if (watchedCurrency && watchedCurrency !== 'USD' && rates[watchedCurrency]) {
      const exchangeRateToUSD = getExchangeRateToUSD(watchedCurrency, rates)
      form.setValue('exchangeRate', exchangeRateToUSD)
      form.setValue('exchangeRateDate', new Date().toISOString().split('T')[0])
    } else if (watchedCurrency === 'USD') {
      // Clear exchange rate fields for USD
      form.setValue('exchangeRate', undefined)
      form.setValue('exchangeRateDate', undefined)
    }
  }, [watchedCategory, watchedCurrency, rates, form])

  async function onSubmit(data: ReimbursementFormData) {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'receipt' && value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString())
        }
      })

      // Add file
      if (!selectedFile) {
        toast({
          title: "Error",
          description: "Please select or scan a receipt",
          variant: "destructive"
        })
        return
      }

      formData.append('receipt', selectedFile)

      const response = await fetch('/api/reimburse', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PDF')
      }

      // Handle PDF download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'reimbursement.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "PDF Generated Successfully! 📄",
        description: "Your reimbursement PDF has been downloaded and is ready for submission."
      })

      // Reset form
      form.reset()
      setSelectedFile(null)

    } catch (error: any) {
      console.error('Submission error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit reimbursement. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 md:px-0 space-y-6 md:space-y-8">
      {/* Info Banner - Mobile Optimized */}
      <div className="rounded-lg md:border p-4 bg-slate-50 md:border-slate-200">
        <h3 className="font-medium text-slate-900 mb-2 text-sm md:text-base">Expense Reimbursement Form</h3>
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
          Complete all required fields and attach your receipt to generate a professional PDF.
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter merchant name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? undefined}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? undefined}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? undefined}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory && EXPENSE_CATEGORIES[selectedCategory as keyof typeof EXPENSE_CATEGORIES] && (
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES[selectedCategory as keyof typeof EXPENSE_CATEGORIES]?.map(subcategory => (
                          <SelectItem key={subcategory} value={subcategory}>
                            {subcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAID_BY_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectOrClient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project/Client</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional project or client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approverEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approver Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="approver@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Business Purpose - Required */}
          <FormField
            control={form.control}
            name="businessPurpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Purpose *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the business relationship and purpose (e.g., 'Met with ViewSonic client to discuss Q4 project planning and marketing strategy deliverables')"
                    className="resize-none min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Attendees - For meals & entertainment */}
          {(selectedCategory === 'Meals & Entertainment') && (
            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List attendees with full names, companies, and relationships (e.g., 'John Doe (ViewSonic, Creative Director), Casper Koopman (CDD Advisors, Business Lead)')"
                      className="resize-none min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Currency Exchange Fields */}
          {showCurrencyFields && (
            <div className="space-y-4">
              {/* Exchange Rate Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Current Exchange Rate: {watchedCurrency && rates[watchedCurrency] ? 
                        formatExchangeRate(watchedCurrency, getExchangeRateToUSD(watchedCurrency, rates)) : 
                        'Loading...'}
                    </p>
                    {lastUpdated && (
                      <p className="text-xs text-blue-700">
                        {isUsingFallback ? 'Using fallback rates' : `Updated: ${lastUpdated}`}
                      </p>
                    )}
                  </div>
                  {ratesLoading && (
                    <div className="text-xs text-blue-600">Loading...</div>
                  )}
                </div>
                {ratesError && (
                  <p className="text-xs text-orange-600 mt-1">
                    {ratesError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="exchangeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate to USD</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="1.3500"
                          {...field}
                          value={field.value ?? undefined}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <p className="text-xs text-slate-600">Auto-populated with current rate, edit if needed</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exchangeRateDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ?? undefined}
                        />
                      </FormControl>
                      <p className="text-xs text-slate-600">Date when the exchange rate was valid</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Travel/Mileage Fields */}
          {showTravelFields && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="startLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Starting point" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Destination" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="milesDriven"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miles Driven</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? undefined}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mileageRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mileage Rate ($/mile)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.655"
                          {...field}
                          value={field.value ?? undefined}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Receipt Confirmation */}
          <FormField
            control={form.control}
            name="receiptAttached"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Receipt Attached
                  </FormLabel>
                  <p className="text-xs text-slate-600">
                    Confirm that you have attached a receipt for this expense
                  </p>
                </div>
              </FormItem>
            )}
          />

          {/* Additional Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional details or context..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Reimbursement Policy Reference */}
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Reimbursement Policy:</p>
            <p>All reimbursements are submitted under CDD Advisors&apos; accountable plan as defined by IRS Reg. §1.62-2. By submitting this form, you certify that this expense was incurred for legitimate business purposes and complies with company policy.</p>
          </div>

          <div className="space-y-3">
            <Label>Receipt *</Label>
            <ReceiptScanner
              onFileSelect={handleFileSelect}
              disabled={isSubmitting}
            />
            {selectedFile && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Mobile-Optimized Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-14 md:h-12 bg-slate-900 hover:bg-slate-800 text-white text-base md:text-base font-medium rounded-xl md:rounded-lg shadow-lg active:scale-95 transition-all duration-150"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Generating PDF...' : 'Generate Reimbursement PDF'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}