'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { removeDemoData } from '@/app/admin/actions'
import { ConfirmDialog, useToast } from './ui'

export function RemoveDemoButton() {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <>
      <button type="button" disabled={pending} onClick={() => setOpen(true)} className="btn btn-secondary !min-h-10 !text-[14px]">
        {pending ? 'Removendo…' : 'Remover dados de demonstração'}
      </button>
      <ConfirmDialog
        open={open}
        title="Remover dados de demonstração?"
        text="Produtos, marcas, coleções e arquivos fictícios serão apagados definitivamente. O que você cadastrou não é afetado."
        confirmLabel="Remover"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          start(async () => {
            const res = await removeDemoData()
            if (res.ok) {
              toast('ok', 'Dados de demonstração removidos.')
              router.refresh()
            } else toast('bad', res.error)
          })
        }}
      />
    </>
  )
}
