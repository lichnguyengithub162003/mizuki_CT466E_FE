/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const motionCss = readFileSync('src/style.css', 'utf8')
const reducedMotionCss = motionCss.slice(motionCss.indexOf('@media (prefers-reduced-motion: reduce)'))

describe('reusable motion foundation', () => {
  it('defines the Apple-inspired duration and easing tokens', () => {
    expect(motionCss).toContain('--duration-instant: 90ms')
    expect(motionCss).toContain('--duration-fast: 150ms')
    expect(motionCss).toContain('--duration-normal: 240ms')
    expect(motionCss).toContain('--duration-slow: 360ms')
    expect(motionCss).toContain('--duration-emphasis: 480ms')
    expect(motionCss).toContain('--ease-standard: cubic-bezier(0.2, 0, 0, 1)')
    expect(motionCss).toContain('--ease-enter: cubic-bezier(0.16, 1, 0.3, 1)')
    expect(motionCss).toContain('--ease-exit: cubic-bezier(0.4, 0, 1, 1)')
    expect(motionCss).toContain('--ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1)')
  })

  it('uses restrained motion without linear, bounce, spring, or duplicated keyframes', () => {
    expect(motionCss.match(/@keyframes mizuki-motion-enter/g)).toHaveLength(1)
    expect(motionCss.match(/@keyframes mizuki-motion-exit/g)).toHaveLength(1)
    expect(motionCss).not.toMatch(/\blinear\b/i)
    expect(motionCss).not.toMatch(/\bbounce\b/i)
    expect(motionCss).not.toMatch(/\bspring\b/i)
    expect(motionCss).toMatch(
      /\.motion-interactive:not\(:disabled\):active\s*\{[^}]*scale\(0\.99\)/,
    )
    expect(motionCss).toContain('animation: mizuki-skeleton-pulse 2.2s')
  })

  it('maps tooltip and popover motion to every placement', () => {
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(motionCss).toContain(`.motion-tooltip[data-side='${side}']`)
      expect(motionCss).toContain(`.motion-popover[data-side='${side}']`)
    }
    expect(motionCss).toContain('scale(0.985)')
    expect(motionCss).toContain('scale(0.98)')
  })

  it('defines distinct enter and exit motion for modal surfaces', () => {
    expect(motionCss).toContain(".motion-dialog[data-state='open']")
    expect(motionCss).toContain(".motion-dialog[data-state='closed']")
    expect(motionCss).toContain(".motion-drawer-left[data-state='open']")
    expect(motionCss).toContain(".motion-drawer-right[data-state='closed']")
    expect(motionCss).toContain(".motion-sheet[data-state='open']")
    expect(motionCss).toContain(".motion-sheet[data-state='closed']")
    expect(motionCss).toContain('animation-duration: 420ms')
  })

  it('keeps a soft toast enter, exit, and stack move transition', () => {
    expect(motionCss).toContain('.motion-toast-enter-active')
    expect(motionCss).toContain('.motion-toast-leave-active')
    expect(motionCss).toContain('.motion-toast-move')
    expect(motionCss).toContain('translateY(-1rem) scale(0.99)')
  })

  it('disables transform and pulse for reduced-motion users', () => {
    expect(reducedMotionCss).toContain('animation-duration: var(--duration-instant) !important')
    expect(reducedMotionCss).toMatch(/\.motion-skeleton,[\s\S]*animation: none !important/)
    expect(reducedMotionCss).toMatch(
      /\.motion-interactive:not\(:disabled\):active,[\s\S]*transform: none/,
    )
  })
})
