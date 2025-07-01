
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
  onDateChange: (date: Date | undefined) => void;
  buttonClassName?: string;
  placeholder?: string;
  disabled?: boolean; // Added disabled prop
}

export function DatePicker({ date, onDateChange, buttonClassName, placeholder = "Pick a date", disabled = false }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled} // Apply disabled state
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          disabled={disabled || ((d: Date) => d < new Date("1900-01-01"))} // Apply disabled state to calendar days
        />
      </PopoverContent>
    </Popover>
  )
}
