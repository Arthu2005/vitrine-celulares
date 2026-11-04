'use client'

import { createContext, useContext } from 'react'

export type StorePublic = { name: string; whatsapp: string; whatsappTemplate: string }

const Ctx = createContext<StorePublic>({ name: '', whatsapp: '', whatsappTemplate: '' })

export const StorePublicProvider = Ctx.Provider
export const useStorePublic = () => useContext(Ctx)
