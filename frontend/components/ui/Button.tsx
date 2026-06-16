import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  children: React.ReactNode
  className?: string
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'px-4 py-2.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors min-h-[44px] sm:min-h-0 touch-manipulation text-center whitespace-normal leading-tight'
  
  const variants = {
    primary: 'bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white',
    secondary: 'bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white',
    outline: 'bg-white border border-[#E2E8F0] text-black hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A]',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
