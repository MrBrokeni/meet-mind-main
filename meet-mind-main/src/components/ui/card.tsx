import * as React from "react"
import { Slot } from "@radix-ui/react-slot" // Import Slot
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// Updated CardTitle to use Slot and adjust styling
const CardTitle = React.forwardRef<
  HTMLParagraphElement, // Keep the default element type for type safety
  React.HTMLAttributes<HTMLHeadingElement> & { asChild?: boolean } // Add asChild prop
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "h3" // Use Slot if asChild is true, default to h3
  return (
    <Comp
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight", // Adjusted default size to text-lg
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"


const CardDescription = React.forwardRef<
  HTMLParagraphElement, // Use HTMLParagraphElement
  React.HTMLAttributes<HTMLParagraphElement> // Use HTMLParagraphElement
>(({ className, ...props }, ref) => (
  <p // Use <p> tag
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"


const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
