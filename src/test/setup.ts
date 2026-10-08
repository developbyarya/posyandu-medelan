import fakeIndexedDB from 'fake-indexeddb'
import { IDBKeyRange } from 'fake-indexeddb'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// IndexedDB palsu untuk Dexie di lingkungan jsdom.
Object.assign(globalThis, { indexedDB: fakeIndexedDB, IDBKeyRange })

afterEach(() => cleanup())
