'use client'

import React, { useEffect, useState } from 'react'
import type { Prescription, PrescriptionItem } from '@/lib/mock-data/prescriptions'
import type { DrugWithStock } from '@/app/actions/drugs'
import { getSettings } from '@/app/actions/settings'
import type { SystemSettings } from '@/lib/mock-data/settings'

interface ReceiptPrinterProps {
  prescription: Prescription
  items: PrescriptionItem[]
  drugs: DrugWithStock[]
  visible?: boolean
}

export function ReceiptPrinter({ prescription, items, drugs, visible = false }: ReceiptPrinterProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSettings()
        setSettings(data)
      } catch (err) {
        console.error('Failed to load settings for receipt')
      }
    }
    loadSettings()
  }, [])

  return (
    <div className={`receipt-container text-black bg-white w-full max-w-[80mm] mx-auto p-4 text-xs font-mono ${visible ? 'block border shadow-sm' : 'hidden print:block'}`}>
      <div className="text-center mb-4">
        {settings?.pharmacy_logo_url ? (
          <img src={settings.pharmacy_logo_url} alt="Logo" className="h-10 mx-auto mb-2 grayscale" />
        ) : null}
        <h2 className="text-lg font-bold uppercase mb-1">{settings?.pharmacy_name || 'Pharmacy POS'}</h2>
        <p className="whitespace-pre-wrap">{settings?.pharmacy_address || '123 Health Ave, Medical District'}</p>
        <p>Tel: {settings?.pharmacy_phone || '+234 123 456 7890'}</p>
      </div>

      <div className="border-b border-black border-dashed pb-2 mb-2 space-y-1">
        <div className="flex justify-between">
          <span>Receipt No:</span>
          <span>{prescription.receipt_number || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{new Date(prescription.confirmed_at || prescription.created_at).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span className="truncate max-w-[120px]">{prescription.created_by}</span>
        </div>
      </div>

      <div className="border-b border-black border-dashed pb-2 mb-2">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1 font-normal w-1/2">Item</th>
              <th className="py-1 font-normal text-center w-1/6">Qty</th>
              <th className="py-1 font-normal text-right w-1/3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const drug = drugs.find(d => d.id === item.drug_id)
              return (
                <tr key={item.id}>
                  <td className="py-1 truncate pr-1">
                    {drug ? `${drug.name} ${drug.dose}` : 'Unknown Item'}
                    {item.refunded_quantity ? (
                      <div className="text-[9px] text-gray-500 uppercase">
                        (Refunded: {item.refunded_quantity})
                      </div>
                    ) : null}
                  </td>
                  <td className="py-1 text-center align-top">{item.quantity}</td>
                  <td className="py-1 text-right align-top">₦{item.subtotal.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-b border-black border-dashed pb-2 mb-2 space-y-1">
        <div className={`flex justify-between font-bold ${prescription.refunded_amount ? 'text-xs text-gray-600 font-normal' : 'text-sm'}`}>
          <span>{prescription.refunded_amount ? 'ORIGINAL TOTAL' : 'TOTAL'}</span>
          <span>₦{prescription.total_amount.toFixed(2)}</span>
        </div>
        
        {!!prescription.refunded_amount && (
          <>
            <div className="flex justify-between font-normal text-xs text-gray-600">
              <span>REFUND AMOUNT</span>
              <span>-₦{prescription.refunded_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>NET TOTAL</span>
              <span>₦{(prescription.total_amount - prescription.refunded_amount).toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="flex justify-between pt-1">
          <span>Payment Method:</span>
          <span className="capitalize">{prescription.payment_method || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="uppercase">
            {prescription.status} {prescription.refund_status && prescription.refund_status !== 'none' ? `(${prescription.refund_status} Refund)` : ''}
          </span>
        </div>
      </div>

      <div className="text-center mt-4 text-[10px] whitespace-pre-wrap">
        {settings?.receipt_message || 'Thank you for your patronage!\nPlease keep this receipt for your records.'}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}} />
    </div>
  )
}
