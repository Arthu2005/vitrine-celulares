'use client'

import { use, useActionState } from 'react'
import { resetPasswordAction } from '../../../actions'

export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [state, action, pending] = useActionState(resetPasswordAction, null)
  return (
    <form action={action} className="space-y-4">
      <h1 className="title text-[28px]">Criar nova senha</h1>
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="mb-1 block text-[14px] text-silver-2">Nova senha (mínimo de 10 caracteres)</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="text-[14px] text-bad">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        Salvar nova senha
      </button>
    </form>
  )
}
