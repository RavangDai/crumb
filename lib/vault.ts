import { VaultEntry } from './types'

const VAULT_KEY = 'crumb_vault'
const MAX_ENTRIES = 50

export function getVault(): VaultEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveToVault(entry: Omit<VaultEntry, 'id' | 'createdAt'>): VaultEntry {
  const vault = getVault()
  const newEntry: VaultEntry = {
    ...entry,
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    createdAt: Date.now(),
  }
  const updated = [newEntry, ...vault].slice(0, MAX_ENTRIES)
  localStorage.setItem(VAULT_KEY, JSON.stringify(updated))
  return newEntry
}

export function deleteFromVault(id: string): void {
  const vault = getVault().filter(e => e.id !== id)
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

export function extractVaultTitle(content: string): string {
  // Try to get the first meaningful line from MISSION section
  const missionMatch = content.match(/##\s*🎯\s*MISSION\s*\n+([^\n]+)/)
  if (missionMatch) return missionMatch[1].replace(/^\s*[-*]\s*/, '').slice(0, 72).trim()

  // Fallback: first non-empty, non-header line
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('*'))
  return (lines[0] || 'Untitled session').slice(0, 72).trim()
}
