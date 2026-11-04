'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { changePassword, createUser, setUserActive } from '@/app/admin/actions'
import { Field, Section, useToast } from './ui'

type User = { id: string; name: string; email: string; role: string; active: boolean }

export function UsersManager({ users, me }: { users: User[]; me: { id: string; role: string } }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState({ name: '', email: '', role: 'editor' })
  const [created, setCreated] = useState<string | null>(null)
  const [pw, setPw] = useState({ current: '', next: '' })

  return (
    <div className="space-y-4">
      <Section title="Minha senha">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual">
            <input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="field" />
          </Field>
          <Field label="Nova senha (mínimo de 10 caracteres)">
            <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="field" />
          </Field>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await changePassword(pw.current, pw.next)
              if (res.ok) {
                toast('ok', 'Senha alterada.')
                setPw({ current: '', next: '' })
              } else toast('bad', res.error)
            })
          }
          className="btn btn-primary"
        >
          Alterar senha
        </button>
      </Section>

      {me.role === 'owner' && (
        <Section title="Equipe">
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate">{u.name}</p>
                  <p className="truncate text-[13px] text-silver-3">
                    {u.email} · {u.role === 'owner' ? 'Proprietário' : 'Editor'}
                    {u.active ? '' : ' · desativado'}
                  </p>
                </div>
                {u.id !== me.id && (
                  <button
                    type="button"
                    onClick={() =>
                      start(async () => {
                        const res = await setUserActive(u.id, !u.active)
                        if (res.ok) router.refresh()
                        else toast('bad', res.error)
                      })
                    }
                    className="btn btn-secondary !min-h-10 !text-[14px]"
                  >
                    {u.active ? 'Desativar' : 'Reativar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <Field label="Nome">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field" />
            </Field>
            <Field label="E-mail">
              <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="field" />
            </Field>
            <Field label="Perfil">
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="field">
                <option value="editor">Editor</option>
                <option value="owner">Proprietário</option>
              </select>
            </Field>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await createUser(draft)
                if (res.ok) {
                  setCreated(res.password)
                  setDraft({ name: '', email: '', role: 'editor' })
                  router.refresh()
                } else toast('bad', res.error)
              })
            }
            className="btn btn-primary"
          >
            Criar usuário
          </button>
          {created && (
            <p role="status" className="rounded-md border border-accent p-3 text-[14px]">
              Senha inicial (mostrada só agora): <code className="font-mono text-accent">{created}</code>. Peça para a pessoa trocá-la no primeiro acesso.
            </p>
          )}
        </Section>
      )}
    </div>
  )
}
