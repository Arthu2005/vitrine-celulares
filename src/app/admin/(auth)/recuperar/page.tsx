'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestResetAction } from '../../actions'

export default function RecoverPage() {
  const [state, action, pending] = useActionState(requestResetAction, null)
  if (state?.sent) {
    return (
      <div className="space-y-4">
        <h1 className="title text-[28px]">Verifique seu e-mail</h1>
        <p className="text-silver-2">Se este e-mail tiver acesso ao painel, enviamos um link válido por 1 hora.</p>
        <Link href="/admin/login" className="btn btn-secondary w-full">
          Voltar
        </Link>
      </div>
    )
  }
  return (
    <form action={action} className="space-y-4">
      <h1 className="title text-[28px]">Recuperar senha</h1>
      <label className="block">
        <span className="mb-1 block text-[14px] text-silver-2">E-mail</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <button disabled={pending} className="btn btn-primary w-full">
        Enviar link
      </button>
      <Link href="/admin/login" className="block text-center text-[14px] text-silver-2 underline underline-offset-4">
        Voltar ao login
      </Link>
    </form>
  )
}
