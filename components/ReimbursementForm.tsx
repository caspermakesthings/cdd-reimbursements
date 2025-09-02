'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reimbursementSchema, ReimbursementFormData } from '@/lib/schema'
import { CURRENCIES, CATEGORIES, PAYMENT_METHODS, PAID_BY_OPTIONS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/components/ui/use-toast'
import { useState, useEffect } from 'react'
import ReceiptScanner from '@/components/ReceiptScanner'

export default function ReimbursementForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { toast } = useToast()

  const form = useForm<ReimbursementFormData>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: {
      merchant: '',
      amount: 0,
      currency: 'CAD',
      date: new Date().toISOString().split('T')[0],
      category: 'Meals',
      projectOrClient: '',
      paymentMethod: 'Personal card',
      paidBy: 'Me',
      approverEmail: '',
      notes: ''
    }
  })


  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  async function onSubmit(data: ReimbursementFormData) {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'receipt' && value !== undefined && value !== '') {
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes or details..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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