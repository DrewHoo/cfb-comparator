import type { Kind, Ledger, LedgerFile } from '../../src/lib/ledger.ts'
export const DATA: string
export function readLedgerFile(kind: Kind): LedgerFile
export function readCols(kind: Kind, names?: string[] | null): Record<string, Uint8Array>
export function loadLedger(kind: Kind): Ledger
export function builtKinds(): Kind[]
