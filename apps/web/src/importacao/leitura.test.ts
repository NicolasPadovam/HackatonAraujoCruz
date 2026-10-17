import { describe, expect, it } from 'vitest'
import { decodificarTexto } from './leitura'

describe('CSV sem BOM', () => {
  it('UTF-8 sem BOM mantém os acentos', () => {
    expect(decodificarTexto(new TextEncoder().encode('Apólice;Vencimento'))).toBe('Apólice;Vencimento')
  })

  it('UTF-8 com BOM tira o BOM', () => {
    expect(decodificarTexto(new TextEncoder().encode('﻿Apólice'))).toBe('Apólice')
  })

  it('Windows-1252 (Excel em português) é reconhecido', () => {
    // "Apólice" em Windows-1252: ó = 0xF3
    expect(decodificarTexto(new Uint8Array([0x41, 0x70, 0xf3, 0x6c, 0x69, 0x63, 0x65]))).toBe('Apólice')
  })
})
