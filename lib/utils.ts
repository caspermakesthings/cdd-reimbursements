import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateReimbursementId(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() + 
                  (now.getMonth() + 1).toString().padStart(2, '0') + 
                  now.getDate().toString().padStart(2, '0')
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RIMB-${dateStr}-${randomStr}`
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function getYearMonth(dateStr: string): { year: string; month: string } {
  const date = new Date(dateStr + 'T00:00:00')
  return {
    year: date.getFullYear().toString(),
    month: (date.getMonth() + 1).toString().padStart(2, '0')
  }
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}