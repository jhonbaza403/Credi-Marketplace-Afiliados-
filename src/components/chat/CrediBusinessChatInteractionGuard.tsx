'use client'

import { useEffect } from 'react'

export default function CrediBusinessChatInteractionGuard() {
  useEffect(() => {
    if (!window.location.pathname.startsWith('/chat')) return

    const repair = () => {
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="Enviar mensaje"]').forEach((button) => {
        if (button.disabled) button.disabled = false
        button.removeAttribute('aria-disabled')
        button.style.cursor = 'pointer'
      })
    }

    repair()
    const observer = new MutationObserver(repair)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled'],
    })

    return () => observer.disconnect()
  }, [])

  return null
}
