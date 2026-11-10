import { describe, expect, it } from 'vitest'

describe('base de tests', () => {
  it('ejecuta tests con jsdom', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })
})
