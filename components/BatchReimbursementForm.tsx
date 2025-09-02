'use client'

import { useState } from 'react'
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
import ReceiptScanner from '@/components/ReceiptScanner'
import { useExchangeRates, getExchangeRateToUSD, formatExchangeRate } from '@/hooks/useExchangeRates'
import { Plus, Trash2, Edit2, Check, X, Download, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ExpenseItem extends ReimbursementFormData {
  id: string
  receiptFile?: File
}

export default function BatchReimbursementForm() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventDescription, setEventDescription] = useState('')
  const [currentReceipt, setCurrentReceipt] = useState<File | null>(null)
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

  const handleAddExpense = async (data: ReimbursementFormData) => {
    if (!currentReceipt) {
      toast({
        title: "Error",
        description: "Please attach a receipt for this expense",
        variant: "destructive"
      })
      return
    }

    const newExpense: ExpenseItem = {
      ...data,
      id: Date.now().toString(),
      receiptFile: currentReceipt
    }

    setExpenses([...expenses, newExpense])
    setIsAddingNew(false)
    setCurrentReceipt(null)
    form.reset()
    
    toast({
      title: "Expense Added",
      description: `Added ${data.merchant} - $${data.total} ${data.currency}`
    })
  }

  const handleUpdateExpense = async (data: ReimbursementFormData) => {
    if (!editingId) return

    setExpenses(expenses.map(exp => 
      exp.id === editingId 
        ? { ...exp, ...data, receiptFile: currentReceipt || exp.receiptFile }
        : exp
    ))
    setEditingId(null)
    setCurrentReceipt(null)
    form.reset()
    
    toast({
      title: "Expense Updated",
      description: `Updated ${data.merchant}`
    })
  }

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id))
    toast({
      title: "Expense Removed",
      description: "The expense has been removed from the batch"
    })
  }

  const startEditing = (expense: ExpenseItem) => {
    setEditingId(expense.id)
    setIsAddingNew(false)
    form.reset(expense)
    setCurrentReceipt(expense.receiptFile || null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAddingNew(false)
    setCurrentReceipt(null)
    form.reset()
  }

  const handleSubmitBatch = async () => {
    if (expenses.length === 0) {
      toast({
        title: "No Expenses",
        description: "Please add at least one expense to submit",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      
      // Add event description if provided
      if (eventDescription) {
        formData.append('eventDescription', eventDescription)
      }

      // Add each expense and its receipt
      expenses.forEach((expense, index) => {
        // Add expense data as JSON
        formData.append(`expense_${index}`, JSON.stringify(expense))
        
        // Add receipt file
        if (expense.receiptFile) {
          formData.append(`receipt_${index}`, expense.receiptFile)
        }
      })

      formData.append('totalExpenses', expenses.length.toString())

      const response = await fetch('/api/reimburse/batch', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Failed to generate batch PDF'
        
        // Check if response is JSON or text
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.details || errorMessage
          } catch (parseError) {
            console.error('Failed to parse JSON error response:', parseError)
            errorMessage = 'Server returned an invalid error response'
          }
        } else {
          // Handle non-JSON responses (HTML error pages, etc.)
          try {
            const text = await response.text()
            console.error('Non-JSON error response:', text)
          } catch (textError) {
            console.error('Failed to read error response text:', textError)
          }
          
          // Set appropriate error message based on status code
          if (response.status === 413) {
            errorMessage = 'Request too large. Try reducing the number of expenses or file sizes.'
          } else if (response.status === 400) {
            errorMessage = 'Invalid request data. Please check your expense information.'
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.'
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      // Handle PDF download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'batch-reimbursement.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Batch PDF Generated Successfully! 📄",
        description: `Generated PDF for ${expenses.length} expense${expenses.length > 1 ? 's' : ''}`
      })

      // Reset everything
      setExpenses([])
      setEventDescription('')
      form.reset()

    } catch (error: any) {
      console.error('Batch submission error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit batch reimbursement. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalAmount = expenses.reduce((sum, exp) => {
    // Convert to USD for totaling if needed
    const rate = exp.currency !== 'USD' && exp.exchangeRate ? exp.exchangeRate : 1
    return sum + (exp.total / rate)
  }, 0)

  const watchedCategory = form.watch('category')
  const watchedCurrency = form.watch('currency')
  const showTravelFields = watchedCategory === 'Travel'
  const showCurrencyFields = watchedCurrency !== 'USD'

  // Auto-populate exchange rate when currency changes
  if (watchedCurrency && watchedCurrency !== 'USD' && rates[watchedCurrency]) {
    const currentRate = form.getValues('exchangeRate')
    if (!currentRate) {
      const exchangeRateToUSD = getExchangeRateToUSD(watchedCurrency, rates)
      form.setValue('exchangeRate', exchangeRateToUSD)
      form.setValue('exchangeRateDate', new Date().toISOString().split('T')[0])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Event Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-3">Batch Reimbursement</h3>
        <div className="space-y-2">
          <Label htmlFor="eventDescription">Event/Night Description (Optional)</Label>
          <Input
            id="eventDescription"
            placeholder="e.g., Q4 Planning Meeting with ViewSonic Team"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            className="bg-white"
          />
          <p className="text-xs text-blue-700">
            Add a description to group these expenses together (appears on the cover page)
          </p>
        </div>
      </div>

      {/* Expense List */}
      {expenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-slate-900">Added Expenses ({expenses.length})</h4>
            <div className="text-sm text-slate-600">
              Total: ${totalAmount.toFixed(2)} USD
            </div>
          </div>
          
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{expense.merchant}</span>
                      <Badge variant="outline">{expense.category}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-600">
                      <div>Amount: ${expense.total} {expense.currency}</div>
                      <div>Date: {expense.date}</div>
                      <div>Paid By: {expense.paidBy}</div>
                      <div>Method: {expense.paymentMethod.split('-')[0]}</div>
                    </div>
                    {expense.businessPurpose && (
                      <div className="mt-2 text-sm text-slate-700">
                        Purpose: {expense.businessPurpose}
                      </div>
                    )}
                    {expense.receiptFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <FileText className="w-4 h-4" />
                        Receipt attached: {expense.receiptFile.name}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(expense)}
                      disabled={isSubmitting || editingId !== null || isAddingNew}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id)}
                      disabled={isSubmitting || editingId !== null || isAddingNew}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="border-2 border-slate-300 rounded-lg p-4 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-slate-900">
              {editingId ? 'Edit Expense' : 'Add New Expense'}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              className="text-slate-600"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingId ? handleUpdateExpense : handleAddExpense)} className="space-y-4">
              {/* Main form fields in a compact grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

                {watchedCategory && EXPENSE_CATEGORIES[watchedCategory as keyof typeof EXPENSE_CATEGORIES] && (
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
                            {EXPENSE_CATEGORIES[watchedCategory as keyof typeof EXPENSE_CATEGORIES]?.map(subcategory => (
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
              </div>

              {/* Business Purpose */}
              <FormField
                control={form.control}
                name="businessPurpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Purpose *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the business purpose..."
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency Exchange Fields */}
              {showCurrencyFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label>Receipt *</Label>
                <ReceiptScanner
                  onFileSelect={setCurrentReceipt}
                  disabled={false}
                />
                {currentReceipt && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    Selected: {currentReceipt.name}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  <Check className="w-4 h-4 mr-1" />
                  {editingId ? 'Update Expense' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Add New Expense Button */}
      {!isAddingNew && !editingId && (
        <Button
          onClick={() => setIsAddingNew(true)}
          variant="outline"
          className="w-full"
          disabled={isSubmitting}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {expenses.length > 0 ? 'Another' : 'New'} Expense
        </Button>
      )}

      {/* Submit Batch Button */}
      {expenses.length > 0 && !isAddingNew && !editingId && (
        <div className="pt-4 border-t">
          <Button
            onClick={handleSubmitBatch}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white"
            disabled={isSubmitting}
          >
            <Download className="w-5 h-5 mr-2" />
            {isSubmitting 
              ? `Generating Batch PDF...` 
              : `Generate Batch PDF (${expenses.length} expense${expenses.length > 1 ? 's' : ''})`}
          </Button>
        </div>
      )}
    </div>
  )
}
