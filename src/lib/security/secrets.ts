export type SecretFinding = { rule: string; line: number };

// Detección local de patrones conocidos. Nunca incluir el valor coincidente en reportes.
export function inspectSecretText(text: string): SecretFinding[] {
  const rules: Array<[string, RegExp]> = [
    ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
    ["github-credential", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g],
    ["api-credential", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g],
    ["literal-credential", /\b(?:api[_-]?key|secret|password|token)\b["']?\s*[:=]\s*["']([A-Za-z0-9_+/=.-]{16,})["']/gi],
    ["public-credential-config", /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|API_KEY)[A-Z0-9_]*\b/g]
  ];
  return rules.flatMap(([rule, pattern]) => Array.from(text.matchAll(pattern), match => ({
    rule, line: text.slice(0, match.index).split("\n").length
  })));
}
