import { buildInvoicePdf, type InvoicePdfInput } from './invoice-pdf'

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

export async function shareInvoicePdf(input: InvoicePdfInput): Promise<ShareOutcome> {
  const blob = buildInvoicePdf(input)
  const filename = `${input.invoice.invoiceNumber}.pdf`
  const file = new File([blob], filename, { type: 'application/pdf' })

  // Native share sheet (Android Chrome, iOS Safari 16.4+ in some contexts)
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Invoice ${input.invoice.invoiceNumber}`,
        text: `Invoice for ${input.invoice.customerName}`,
      })
      return 'shared'
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled'
      // fall through to download on any other error
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
