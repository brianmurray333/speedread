'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, LibraryBig, Upload, Clipboard } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useToast } from './Toast'

interface MobileBottomNavProps {
  onPaste?: () => void
  onUpload?: () => void
}

export default function MobileBottomNav({ onPaste, onUpload }: MobileBottomNavProps) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const handlePaste = async () => {
    if (onPaste) {
      onPaste()
    } else {
      // Try to read from clipboard directly
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        try {
          // Check if Permissions API is available
          if ('permissions' in navigator && 'query' in navigator.permissions) {
            try {
              // Check current clipboard-read permission status
              const permissionStatus = await navigator.permissions.query({ 
                name: 'clipboard-read' as PermissionName 
              })
              
              // If permission already granted, read directly
              if (permissionStatus.state === 'granted') {
                const text = await navigator.clipboard.readText()
                if (text && text.trim().length > 0) {
                  router.push('/?paste=true')
                } else {
                  showToast('Clipboard is empty. Copy some text first!', 'warning')
                }
                return
              }
              
              // If permission is denied, show helpful message
              if (permissionStatus.state === 'denied') {
                showToast('Clipboard access denied. Please enable it in your browser settings', 'error')
                return
              }
            } catch (permErr) {
              // Permissions API query failed (might not support clipboard-read query)
              console.log('Permission query not supported, attempting direct read')
            }
          }
          
          // For browsers without Permissions API or when permission is 'prompt'
          // Attempt to read directly - this will trigger the permission prompt
          const text = await navigator.clipboard.readText()
          
          // If we get here, permission was granted and we have the text
          if (text && text.trim().length > 0) {
            router.push('/?paste=true')
          } else {
            showToast('Clipboard is empty. Copy some text first!', 'warning')
          }
        } catch (err) {
          console.error('Clipboard read error:', err)
          
          // Provide more specific error messages
          const errorMessage = (err as Error).message || ''
          if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
            showToast('Clipboard access denied. Please allow access and try again', 'error')
          } else if (errorMessage.includes('gesture') || errorMessage.includes('user activation')) {
            showToast('Please try tapping the paste button again', 'warning')
          } else {
            showToast('Could not access clipboard. Please try again', 'error')
          }
        }
      } else {
        showToast('Clipboard access not supported', 'error')
      }
    }
  }

  const handleUpload = () => {
    if (onUpload) {
      onUpload()
    } else {
      // Navigate to home and trigger upload
      if (pathname !== '/') {
        router.push('/')
      }
      // Small delay to ensure page loads before triggering click
      setTimeout(() => {
        // Try to click the file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) {
          fileInput.click()
        } else {
          // Fallback: scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 100)
    }
  }

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onClick: () => router.push('/'),
      isActive: pathname === '/',
    },
    {
      id: 'library',
      label: 'Library',
      icon: LibraryBig,
      onClick: () => router.push('/library'),
      isActive: pathname === '/library',
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: Clipboard,
      onClick: handlePaste,
      isActive: false,
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: Upload,
      onClick: handleUpload,
      isActive: false,
    },
    {
      id: 'theme',
      label: 'Theme',
      icon: null, // We'll render the sun/moon SVG directly
      onClick: toggleTheme,
      isActive: false,
    },
  ]

  return (
    <>
      <ToastContainer />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[color:var(--background)]/95 backdrop-blur-lg border-t border-[color:var(--border)] sm:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 py-3 safe-area-bottom">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`
                  flex flex-col items-center justify-center py-2 px-1 rounded-lg
                  transition-all duration-200
                  ${item.isActive 
                    ? 'text-[color:var(--accent)] bg-[color:var(--accent-glow)]' 
                    : 'text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface)]'
                  }
                `}
                aria-label={item.label}
              >
                {item.id === 'theme' ? (
                  theme === 'dark' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="5" />
                      <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  )
                ) : Icon ? (
                  <Icon className="w-6 h-6" />
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
