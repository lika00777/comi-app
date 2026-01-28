import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
}

export function Alert({ 
  className = '', 
  variant = 'default', 
  title,
  dismissible = false,
  onDismiss,
  children,
  ...props 
}: AlertProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  
  const variants = {
    default: 'bg-gray-50 text-gray-800 border-gray-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    danger: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  }
  
  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) onDismiss()
  }
  
  if (!isVisible) return null
  
  return (
    <div
      className={`relative rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    >
      {title && (
        <h5 className="mb-1 font-medium leading-none tracking-tight">
          {title}
        </h5>
      )}
      <div className="text-sm [&_p]:leading-relaxed">
        {children}
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
