// The model to propose first: the one in use, else a sensible default.
export function preferred(provider: string, models: string[], current: string): string {
  const inUse = current.startsWith(provider + '/') ? current.slice(provider.length + 1) : ''
  if (models.includes(inUse)) return inUse
  const likes: Record<string, RegExp[]> = {
    anthropic: [/sonnet/, /opus/],
    openai: [/^gpt-[\d.]+-sol/, /^gpt-/],
    xai: [/^grok-[\d.]+$/, /^grok/],
    gemini: [/pro-latest/, /flash-latest/, /pro/],
  }
  for (const re of likes[provider] ?? []) {
    const found = [...models].reverse().find(m => re.test(m))
    if (found) return found
  }
  return models[0] ?? ''
}
