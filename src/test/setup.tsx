import '@testing-library/jest-dom'
import 'vitest-canvas-mock'
import React from 'react'
import { expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import * as Tooltip from "@radix-ui/react-tooltip"

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock navigator.onLine
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    onLine: true,
  },
  writable: true,
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock xterm
vi.mock('@xterm/xterm', () => {
  return {
    Terminal: vi.fn().mockImplementation(() => ({
      loadAddon: vi.fn(),
      open: vi.fn(),
      dispose: vi.fn(),
      onData: vi.fn(),
      onResize: vi.fn(),
      write: vi.fn(),
      clear: vi.fn(),
      scrollToBottom: vi.fn(),
    })),
  }
})

vi.mock('@xterm/addon-fit', () => {
  return {
    FitAddon: vi.fn().mockImplementation(() => ({
      fit: vi.fn(),
      proposeDimensions: vi.fn().mockReturnValue({ cols: 80, rows: 24 }),
    })),
  }
})

vi.mock('@xterm/addon-web-links', () => {
  return {
    WebLinksAddon: vi.fn(),
  }
})

// Re-export everything from RTL
export * from '@testing-library/react'

// Override render method
vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testing-library/react')>()

  // Define customRender inside the factory to avoid hoisting issues
  const customRender = (ui: React.ReactElement, { wrapper: Wrapper, ...options }: any = {}) =>
    actual.render(ui, {
      wrapper: ({ children }) => (
        <Tooltip.Provider delayDuration={0}>
          {Wrapper ? <Wrapper>{children}</Wrapper> : children}
        </Tooltip.Provider>
      ),
      ...options,
    })

  return {
    ...actual,
    render: customRender,
  }
})
