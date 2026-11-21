// A workspace's colour, from the agents' family in DESIGN.md (never a
// status colour), fixed by its slug so it never moves.
export const COLOURS: [string, string][] = [
  ['#4C8DFF', '#0B1A33'], ['#F39C4A', '#2A1404'], ['#8B6CF6', '#170D33'],
  ['#4FCB8F', '#08261A'], ['#E07AB0', '#2E0B1E'], ['#3FBFD0', '#06262B'],
]

export function colour(slug: string): [string, string] {
  let h = 2166136261
  for (const c of slug) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  return COLOURS[h % COLOURS.length]
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => [...w][0]).join('').toUpperCase() || '?'
}
