'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction } from '../../actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)
  return (
    <form action={action} className="space-y-4">
      <h1 className="title text-[32px]">Painel da loja</h1>
      <label className="block">
        <span className="mb-1 block text-[14px] text-silver-2">E-mail</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[14px] text-silver-2">Senha</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="text-[14px] text-bad">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
      <Link href="/admin/recuperar" className="block text-center text-[14px] text-silver-2 underline underline-offset-4">
        Esqueci minha senha
      </Link>
    </form>
  )
}
