/// <reference types="vite/client" />
interface Window { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (e: string, f: (...a: never[]) => void) => void; removeListener?: (e: string, f: (...a: never[]) => void) => void } }
