// src/components/ui/date-picker.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean; // Add disabled prop
}

export function DatePicker({ date, setDate, className, disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-11", // Match lg button height
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          disabled={disabled} // Pass disabled state to Calendar
        />
      </PopoverContent>
    </Popover>
  )
}
