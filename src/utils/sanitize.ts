// Allowlist HTML sanitizer — only permits safe formatting tags, no attributes.
// Call this before any innerHTML assignment or dangerouslySetInnerHTML injection.
const ALLOWED_TAGS = new Set(['b', 'i', 'u', 'strong', 'em', 'ul', 'li', 'br'])

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const output = document.createElement('div')

  function walkNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(false)
    if (node.nodeType !== Node.ELEMENT_NODE) return null

    const el = node as Element
    const tag = el.tagName.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed element with just its sanitized children
      const frag = document.createDocumentFragment()
      node.childNodes.forEach(child => {
        const s = walkNode(child)
        if (s) frag.appendChild(s)
      })
      return frag
    }

    const safe = document.createElement(tag)
    // Strip all attributes — none are permitted
    node.childNodes.forEach(child => {
      const s = walkNode(child)
      if (s) safe.appendChild(s)
    })
    return safe
  }

  doc.body.childNodes.forEach(child => {
    const s = walkNode(child)
    if (s) output.appendChild(s)
  })

  // output is a detached DOM node we built — no script execution possible
  return output.innerHTML
}
