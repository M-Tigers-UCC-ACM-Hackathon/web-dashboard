'use client'

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

interface ThemeAwareLogoProps {
  width?: number
  height?: number
  className?: string
}

export default function ThemeAwareLogo({ width = 80, height = 80, className = "rounded-full" }: ThemeAwareLogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [currentTheme, setCurrentTheme] = useState<string | undefined>("light")

  useEffect(() => {
    // resolvedTheme gives us the actual theme (useful for system preference)
    setCurrentTheme(resolvedTheme || theme)
  }, [theme, resolvedTheme])

  // Use a different logo based on theme
  const logoSrc = currentTheme === "dark" 
    ? "/system-logo-light-mode.png"  // Path to your dark mode logo
    : "/system-logo-dark-mode.png" // Path to your light mode logo

  return (
    <Image 
      src={logoSrc} 
      alt="Logo" 
      width={width} 
      height={height}
      className={className}
    />
  )
}