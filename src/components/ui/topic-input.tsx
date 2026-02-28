"use client"
import { useState, KeyboardEvent, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X } from "lucide-react"

// Seed suggestions — swapped for DB-backed query in Phase 6 (PREF-04 foundation)
const SEED_SUGGESTIONS = [
  "Artificial Intelligence", "Formula 1", "UK Politics", "US Politics",
  "Climate Change", "Tech Startups", "Cryptocurrency", "Football",
  "UK Economy", "Global Markets", "Space Exploration", "Cybersecurity",
  "Healthcare", "Electric Vehicles", "Renewable Energy", "UK Housing Market",
  "AI Policy", "Geopolitics", "Science", "Film & TV",
]

interface TopicInputProps {
  value: string[]
  onChange: (topics: string[]) => void
}

export function TopicInput({ value: topics, onChange }: TopicInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTopic = (topic: string) => {
    const trimmed = topic.trim().replace(/,$/, "").trim()
    if (!trimmed || topics.includes(trimmed)) return
    onChange([...topics, trimmed])
    setInputValue("")
    setOpen(false)
  }

  const removeTopic = (topic: string) => {
    onChange(topics.filter((t) => t !== topic))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTopic(inputValue)
    }
    // Backspace on empty input removes the last chip
    if (e.key === "Backspace" && !inputValue && topics.length > 0) {
      onChange(topics.slice(0, -1))
    }
  }

  const filteredSuggestions = SEED_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !topics.includes(s)
  )

  return (
    <div
      className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[80px] cursor-text focus-within:ring-2 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {topics.map((topic) => (
        <Badge key={topic} variant="secondary" className="gap-1 text-sm py-1">
          {topic}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTopic(topic) }}
            aria-label={`Remove ${topic}`}
            className="ml-1 rounded-full hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open && (filteredSuggestions.length > 0 || inputValue.length > 0)} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setOpen(true) }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={topics.length === 0 ? "Type a topic and press Enter..." : "Add another topic..."}
            className="flex-1 min-w-[180px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
            aria-label="Add topic"
          />
        </PopoverTrigger>
        {filteredSuggestions.length > 0 && (
          <PopoverContent className="p-0 w-[280px]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <Command>
              <CommandGroup heading="Suggestions">
                {filteredSuggestions.slice(0, 6).map((s) => (
                  <CommandItem
                    key={s}
                    onSelect={() => { addTopic(s); inputRef.current?.focus() }}
                  >
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  )
}
