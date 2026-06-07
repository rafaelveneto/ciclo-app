import { useEffect, useState } from 'react'

/**
 * Conservative device detection.
 *
 * We only treat a visitor as "desktop" when we're confident: a fine pointer
 * (mouse), no touch, and a non-mobile user agent. Anything ambiguous (touch
 * laptops, tablets, phones) is treated as mobile so the app stays usable —
 * we never want to block a real phone/tablet behind the desktop QR screen.
 */
function detectDesktop(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const mobileUA = /android|iphone|ipad|ipod|mobile|tablet|kindle|silk|playbook|bb10|opera mini|iemobile/i.test(ua)
  if (mobileUA) return false
  // iPadOS 13+ masquerades as "Macintosh" but has touch points.
  const hasTouch = navigator.maxTouchPoints > 1 || 'ontouchstart' in window
  const finePointer = window.matchMedia('(pointer: fine)').matches
  return finePointer && !hasTouch
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const displayStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayStandalone || iosStandalone
}

export function useDevice(): { isDesktop: boolean; isStandalone: boolean } {
  const [state, setState] = useState(() => ({
    isDesktop: detectDesktop(),
    isStandalone: detectStandalone(),
  }))

  useEffect(() => {
    const update = () =>
      setState({ isDesktop: detectDesktop(), isStandalone: detectStandalone() })
    // display-mode can change if the user installs while the tab is open
    const mq = window.matchMedia('(display-mode: standalone)')
    mq.addEventListener?.('change', update)
    window.addEventListener('resize', update)
    return () => {
      mq.removeEventListener?.('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return state
}
