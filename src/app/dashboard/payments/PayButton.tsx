'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markPaid } from '@/app/actions'
import { formatNaira } from '@/lib/utils'
import { useToast } from '@/components/Toast'

interface Props {
  lineItemId: number
  description: string
  amount: number
}

export default function PayButton({ lineItemId, description, amount }: Props) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handlePay() {
    startTransition(async () => {
      const result = await markPaid(lineItemId)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast(`Paid "${description}" — ${formatNaira(amount)}`, 'success')
        router.refresh()
      }
    })
  }

  return (
    <button
      className="act-btn act-pay"
      onClick={handlePay}
      disabled={isPending}
      style={{ fontSize: 11 }}
    >
      {isPending ? '…' : '💳 Mark paid'}
    </button>
  )
}
