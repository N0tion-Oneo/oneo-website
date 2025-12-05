/**
 * Utility functions for parsing Django-style template syntax in the frontend.
 * Used for email template previews.
 */

/**
 * Evaluates Django-style conditionals in HTML templates.
 * Handles nested {% if %}...{% else %}...{% endif %} blocks.
 *
 * @param html - The HTML string containing Django template tags
 * @param context - Object with variable values to evaluate conditions against
 * @returns The processed HTML with conditionals evaluated
 */
export function evaluateDjangoConditionals(
  html: string,
  context: Record<string, unknown>
): string {
  let result = html
  let iterations = 0
  const maxIterations = 100

  // Helper to find matching endif for an if block (handles nesting)
  const findMatchingEndif = (str: string, startPos: number): number => {
    let depth = 1
    let pos = startPos
    while (depth > 0 && pos < str.length) {
      const nextTag = str.indexOf('{%', pos)
      if (nextTag === -1) break
      const tagEnd = str.indexOf('%}', nextTag)
      if (tagEnd === -1) break
      const tagContent = str.substring(nextTag + 2, tagEnd).trim()
      if (tagContent.startsWith('if ')) {
        depth++
      } else if (tagContent === 'endif') {
        depth--
        if (depth === 0) return nextTag
      }
      pos = tagEnd + 2
    }
    return -1
  }

  // Helper to find else at the same nesting level
  const findElseAtLevel = (
    str: string,
    startPos: number,
    endPos: number
  ): number => {
    let depth = 0
    let pos = startPos
    while (pos < endPos) {
      const nextTag = str.indexOf('{%', pos)
      if (nextTag === -1 || nextTag >= endPos) break
      const tagEnd = str.indexOf('%}', nextTag)
      if (tagEnd === -1) break
      const tagContent = str.substring(nextTag + 2, tagEnd).trim()
      if (tagContent.startsWith('if ')) {
        depth++
      } else if (tagContent === 'endif') {
        depth--
      } else if (tagContent === 'else' && depth === 0) {
        return nextTag
      }
      pos = tagEnd + 2
    }
    return -1
  }

  // Evaluate a condition string
  const evaluateCondition = (condition: string): boolean => {
    if (condition.includes(' or ')) {
      return condition.split(/\s+or\s+/).some((part) => {
        const varName = part.trim().replace('branding.', '')
        return Boolean(context[varName])
      })
    }
    const varName = condition.replace('branding.', '')
    return Boolean(context[varName])
  }

  while (iterations < maxIterations) {
    // Find first {% if %} tag
    const ifMatch = result.match(/\{%\s*if\s+([^%]+)\s*%\}/)
    if (!ifMatch || ifMatch.index === undefined) break

    const ifStart = ifMatch.index
    const ifTagEnd = ifStart + ifMatch[0].length
    const condition = ifMatch[1].trim()

    // Find matching endif
    const endifStart = findMatchingEndif(result, ifTagEnd)
    if (endifStart === -1) break
    const endifEnd = result.indexOf('%}', endifStart) + 2

    // Find else at same level
    const elseStart = findElseAtLevel(result, ifTagEnd, endifStart)

    let ifContent: string
    let elseContent: string

    if (elseStart !== -1) {
      const elseTagEnd = result.indexOf('%}', elseStart) + 2
      ifContent = result.substring(ifTagEnd, elseStart)
      elseContent = result.substring(elseTagEnd, endifStart)
    } else {
      ifContent = result.substring(ifTagEnd, endifStart)
      elseContent = ''
    }

    const conditionResult = evaluateCondition(condition)
    const replacement = conditionResult ? ifContent : elseContent
    result =
      result.substring(0, ifStart) + replacement + result.substring(endifEnd)
    iterations++
  }

  return result
}
