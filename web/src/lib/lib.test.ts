import { describe, expect, it } from 'vitest'
import { inline, parse } from './markdown'
import { says, hostPath } from './says'
import { colour, initials } from './colour'

describe('markdown', () => {
  it('reads paragraphs, lists, headings and code', () => {
    const nodes = parse('# Plan\n\nIntro line\nsecond\n\n- a\n- **b**\n1. one\n\n```\nx < y\n```')
    expect(nodes.map(n => n.t)).toEqual(['h', 'p', 'ul', 'ol', 'pre'])
    expect(nodes[1]).toEqual({ t: 'p', lines: [[{ t: 'text', v: 'Intro line' }], [{ t: 'text', v: 'second' }]] })
    expect(nodes[4]).toEqual({ t: 'pre', v: 'x < y' })
  })
  it('keeps only http(s) links', () => {
    expect(inline('[ok](https://a.example/x)')).toEqual([{ t: 'a', href: 'https://a.example/x', c: [{ t: 'text', v: 'ok' }] }])
    expect(inline('[no](javascript:alert(1))')).toEqual([{ t: 'text', v: '[no](javascript:alert(1))' }])
  })
  it('leaves markup as text', () => {
    expect(inline('<img src=x onerror=1>')).toEqual([{ t: 'text', v: '<img src=x onerror=1>' }])
    expect(inline('2*3*4')).toEqual([{ t: 'text', v: '2*3*4' }])
  })
})

describe('says', () => {
  it('puts tool calls in plain words', () => {
    expect(says('web_search', { query: 'q' }).text).toBe('Searched the web for “q”')
    expect(says('web_fetch', { url: 'https://www.example.com/a/b?c' }).text).toBe('Read www.example.com/a/b')
    expect(says('mcp__github__create_issue', {}).text).toBe('github · create issue')
    expect(says('list_files', {}).text).toBe("Looked in the workspace's folder")
    expect(hostPath('not a url')).toBe('not a url')
  })
})

describe('colour', () => {
  it('is stable and spread', () => {
    expect(colour('personal')).toEqual(colour('personal'))
    expect(new Set(['personal', 'acme-ltd', 'a30m', 'family'].map(s => colour(s)[0])).size).toBe(4)
    expect(initials('Acme Ltd')).toBe('AL')
    expect(initials('  ')).toBe('?')
  })
})
