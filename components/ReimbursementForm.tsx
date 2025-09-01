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
import ConnectOneDrive from '@/components/ConnectOneDrive'
import ReceiptScanner from '@/components/ReceiptScanner'

export default function ReimbursementForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean } | null>(null)
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

  useEffect(() => {
    async function fetchDriveStatus() {
      try {
        const response = await fetch('/api/drive/status')
        const data = await response.json()
        setDriveStatus(data)
      } catch (error) {
        console.error('Failed to fetch drive status:', error)
        setDriveStatus({ connected: false })
      }
    }

    fetchDriveStatus()
  }, [])

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

      if (response.headers.get('content-type') === 'application/pdf') {
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
          title: "Success!",
          description: "Your reimbursement PDF has been downloaded."
        })
      } else {
        // Handle JSON response (OneDrive upload)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to submit reimbursement')
        }

        if (result.status === 'uploaded') {
          toast({
            title: "Uploaded to OneDrive!",
            description: `${result.id}.pdf uploaded to PDFs folder. Supporting documents (JSON + receipt) saved separately for organization.`,
            action: result.webUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(result.webUrl, '_blank')}
              >
                Open PDF
              </Button>
            ) : undefined
          })
        }
      }

      // Reset form
      form.reset()
      setSelectedFile(null)

      // Refresh drive status
      const statusResponse = await fetch('/api/drive/status')
      const statusData = await statusResponse.json()
      setDriveStatus(statusData)

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
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Connection Status */}
      <div className={`border rounded-lg p-4 ${driveStatus?.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
        <h3 className="font-semibold mb-2">OneDrive Integration</h3>
        {driveStatus?.connected ? (
          <p className="text-sm text-green-700 mb-4">
            ✅ Connected to OneDrive! Your reimbursement will be automatically uploaded and organized.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            Connect your Microsoft account to automatically save reimbursements to OneDrive. Otherwise, we'll generate a PDF for you to download.
          </p>
        )}
        <ConnectOneDrive />
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting
              ? 'Processing...'
              : driveStatus?.connected
              ? 'Submit & Upload to OneDrive'
              : 'Submit & Download PDF'
            }
          </Button>
        </form>
      </Form>
    </div>
  )
}