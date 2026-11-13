import { useEffect } from 'react'

export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null
  return (
    <div className={`toast toast-${message.type ?? 'success'}`} role="status">
      {message.text}
    </div>
  )
}
