'use client'

import React, { useState, useRef, useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  defaultValue?: string
}

const textInputClass =
  'h-11 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-black placeholder:text-[#64749A] focus:outline-none focus:ring-2 focus:ring-[#0F172A] sm:px-4'

const passwordBoxClass =
  'flex h-11 w-full items-center overflow-hidden rounded-md border border-[#E2E8F0] bg-white focus-within:ring-2 focus-within:ring-[#0F172A]'

const passwordInputClass =
  'h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-medium text-black placeholder:text-[#64749A] outline-none ring-0 focus:outline-none focus:ring-0'

const passwordToggleClass =
  'flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[#64748B] hover:text-[#0F172A] focus:outline-none'

function EyeOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  )
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    className = '',
    value,
    onChange,
    onFocus,
    onBlur,
    defaultValue,
    type,
    id: idProp,
    autoComplete,
    ...props
  },
  forwardedRef
) {
  const [isCleared, setIsCleared] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const setInputRef = (el: HTMLInputElement | null) => {
    inputRef.current = el
    if (typeof forwardedRef === 'function') forwardedRef(el)
    else if (forwardedRef) forwardedRef.current = el
  }
  const initialValueRef = useRef(defaultValue || '')
  const generatedId = useId()
  const inputId = idProp ?? generatedId
  const isPassword = type === 'password'

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!isCleared && value === initialValueRef.current && initialValueRef.current !== '') {
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
      setIsCleared(true)
    }
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const isEmpty =
      !value || (typeof value === 'string' && value.trim() === '')
    if (isCleared && isEmpty && initialValueRef.current !== '') {
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: initialValueRef.current },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
      setIsCleared(false)
    }
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCleared && e.target.value !== initialValueRef.current) {
      setIsCleared(true)
    }
    if (e.target.value !== '' && e.target.value !== initialValueRef.current) {
      setIsCleared(true)
    }
    onChange?.(e)
  }

  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className={`flex w-full flex-col gap-2.5 ${className}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-black sm:text-[14.21px]"
        >
          {label}
        </label>
      )}

      {isPassword ? (
        <div className={passwordBoxClass}>
          <input
            ref={setInputRef}
            id={inputId}
            className={passwordInputClass}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            type={inputType}
            autoComplete={autoComplete ?? 'off'}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            className={passwordToggleClass}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        </div>
      ) : (
        <input
          ref={setInputRef}
          id={inputId}
          className={textInputClass}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          type={inputType}
          autoComplete={autoComplete}
          {...props}
        />
      )}

      {error && (
        <span className="text-xs text-red-500 sm:text-sm">{error}</span>
      )}
    </div>
  )
})

export default Input
