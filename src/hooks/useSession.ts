import { useContext } from 'react'
import { SessionCtx } from '../session/SessionProvider'

export function useSession() {
  return useContext(SessionCtx)
}
