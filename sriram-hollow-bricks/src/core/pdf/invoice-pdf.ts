import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DbBusiness, DbCustomer, DbInvoice } from '@/core/db/schema'

export interface InvoicePdfInput {
  business: DbBusiness
  customer: Pick<DbCustomer, 'name' | 'phone' | 'address'>
  invoice: DbInvoice
}

/** Indian grouping + "Rs." prefix, no ₹ glyph dependency. */
export function amountForPdf(rupees: number): string {
  const hasPaise = Math.abs(Math.round(rupees * 100)) % 100 !== 0
  const n = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees)
  return `Rs. ${n}`
}

export function buildInvoicePdf(input: InvoicePdfInput): Blob {
  const { business, customer, invoice } = input
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15

  // ---- Header: business identity (left) ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(business.name, margin, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let y = 28
  if (business.address) {
    const lines = doc.splitTextToSize(business.address, 90) as string[]
    doc.text(lines, margin, y)
    y += lines.length * 4
  }
  if (business.phone) { doc.text(`Phone: ${business.phone}`, margin, y); y += 4 }
  if (business.gstin) { doc.text(`GSTIN: ${business.gstin}`, margin, y); y += 4 }

  // ---- Header: invoice meta (right) ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('INVOICE', pageW - margin, 22, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`# ${invoice.invoiceNumber}`, pageW - margin, 30, { align: 'right' })
  doc.text(
    new Date(invoice.issuedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    pageW - margin, 35, { align: 'right' }
  )

  // ---- Bill To ----
  y = Math.max(y + 6, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('BILL TO', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(customer.name, margin, y)
  y += 4.5
  if (customer.phone) { doc.text(customer.phone, margin, y); y += 4.5 }
  if (customer.address) {
    const lines = doc.splitTextToSize(customer.address, 90) as string[]
    doc.text(lines, margin, y)
    y += lines.length * 4.5
  }

  // ---- Line items table ----
  autoTable(doc, {
    startY: y + 8,
    margin: { left: margin, right: margin },
    head: [['Item', 'Qty', 'Unit', 'Price', 'Total']],
    body: invoice.lineItems.map((l) => [
      l.name,
      String(l.qty),
      l.unit,
      amountForPdf(l.price),
      amountForPdf(l.total),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [220, 220, 220] },
    headStyles: { fillColor: [139, 58, 30], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 246, 244] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
    },
  })

  // ---- Totals ----
  type AutoTable = { lastAutoTable?: { finalY: number } }
  let ty = ((doc as unknown as AutoTable).lastAutoTable?.finalY ?? y + 20) + 8
  const labelX = pageW - margin - 55
  const valueX = pageW - margin

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  doc.text('Subtotal', labelX, ty, { align: 'right' })
  doc.text(amountForPdf(invoice.subtotal), valueX, ty, { align: 'right' })
  ty += 5

  if (invoice.discount > 0) {
    doc.text('Discount', labelX, ty, { align: 'right' })
    doc.text(`- ${amountForPdf(invoice.discount)}`, valueX, ty, { align: 'right' })
    ty += 5
  }

  doc.setDrawColor(200)
  doc.line(labelX - 5, ty - 1, valueX, ty - 1)
  ty += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Total', labelX, ty, { align: 'right' })
  doc.text(amountForPdf(invoice.total), valueX, ty, { align: 'right' })
  ty += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Paid', labelX, ty, { align: 'right' })
  doc.text(amountForPdf(invoice.paidAmount), valueX, ty, { align: 'right' })
  ty += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Balance', labelX, ty, { align: 'right' })
  doc.text(amountForPdf(invoice.balance), valueX, ty, { align: 'right' })

  // ---- Notes ----
  if (invoice.notes) {
    ty += 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('NOTES', margin, ty)
    ty += 4
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(invoice.notes, pageW - margin * 2) as string[]
    doc.text(lines, margin, ty)
  }

  // ---- Footer ----
  doc.setFontSize(8)
  doc.setTextColor(130)
  doc.text(
    'Thank you for your business.',
    pageW / 2, pageH - 12, { align: 'center' }
  )

  return doc.output('blob')
}
