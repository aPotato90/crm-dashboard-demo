"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Free-form tags. Type and press Enter or comma to add; Backspace in an empty
 * field removes the last tag; each tag has its own remove button.
 */
export function TagsInput({
  id,
  value,
  onChange,
  maxTags,
  maxLength,
  invalid,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags: number;
  maxLength: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim().toLowerCase().slice(0, maxLength);
    setDraft("");
    if (!tag || value.includes(tag) || value.length >= maxTags) return;
    onChange([...value, tag]);
  }

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      {value.length > 0 && (
        <ul className="contents" aria-label="Tags">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary pr-0.5 pl-2 text-xs font-medium text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove tag ${tag}`}
              >
                <XIcon aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={draft}
        maxLength={maxLength}
        onChange={(event) => {
          const next = event.target.value;
          if (next.endsWith(",")) add(next.slice(0, -1));
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft);
          } else if (
            event.key === "Backspace" &&
            draft === "" &&
            value.length
          ) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        disabled={value.length >= maxTags}
        placeholder={
          value.length >= maxTags ? "Tag limit reached" : "Add a tag"
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-6 min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
