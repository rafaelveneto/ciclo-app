import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectIos(): boolean {
  const ua = navigator.userAgent
  // iPhone, iPad (modern iPadOS reports as Macintosh with touch)
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function detectSafari(): boolean {
  const ua = navigator.userAgent
  return /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
}

export function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    // iOS Safari also sets navigator.standalone
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (standalone || iosStandalone) {
      setIsInstalled(true)
      return
    }

    const ios = detectIos()
    const safari = detectSafari()
    setIsIos(ios)
    setIsIosSafari(ios && safari)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallEvent(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setInstallEvent(null)
      setIsInstalled(true)
    }
  }

  return {
    canInstall: !!installEvent,
    isInstalled,
    isIos,
    isIosSafari,
    install,
  }
}
