import { describe, it, expect } from 'vitest'
import { highlightLogLine } from '../components/shared/logUtils'
import { highlight } from 'sugar-high'

import React from 'react'

describe('XSS Vulnerability Audit', () => {
  describe('logUtils: highlightLogLine', () => {
    it('should escape HTML tags to prevent XSS', () => {
      const maliciousLine = '<img src=x onerror=alert(1)>'
      const result = highlightLogLine(maliciousLine) as React.DetailedReactHTMLElement<{ dangerouslySetInnerHTML: { __html: string } }, HTMLElement>

      const html = result.props.dangerouslySetInnerHTML.__html
      // If it's vulnerable, the html will contain the raw img tag
      // If it's secured, it should be escaped (e.g., &lt;img...)
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
    })

    it('should prevent XSS when highlighting log levels', () => {
      const maliciousLine = 'ERROR <script>alert("xss")</script>'
      const result = highlightLogLine(maliciousLine) as React.DetailedReactHTMLElement<{ dangerouslySetInnerHTML: { __html: string } }, HTMLElement>

      const html = result.props.dangerouslySetInnerHTML.__html
      expect(html).toContain('text-red-400')
      expect(html).not.toContain('<script>')
    })

    it('should prevent XSS in search filters', () => {
      const line = 'Some log message'
      const filter = '"><img src=x onerror=alert(1)>'
      const result = highlightLogLine(line, filter) as React.DetailedReactHTMLElement<{ dangerouslySetInnerHTML: { __html: string } }, HTMLElement>

      const html = result.props.dangerouslySetInnerHTML.__html
      expect(html).not.toContain('<img')
    })
  })

  describe('sugar-high: highlight', () => {
    it('should escape HTML in highlighted code', () => {
      const code = 'const x = "</div><script>alert(1)</script>"'
      const highlighted = highlight(code)

      // If sugar-high doesn't escape, this is a vulnerability when used with dangerouslySetInnerHTML
      expect(highlighted).not.toContain('</div>')
      expect(highlighted).not.toContain('<script>')
      // Verify it is indeed escaped
      expect(highlighted).toContain('&lt;/div&gt;')
    })
  })
})
