"use client";

import {
  Building2Icon,
  KanbanSquareIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrencyCompact } from "@/lib/crm/format";
import { STAGE_LABELS } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./nav-links";
import { useCrmData } from "./use-crm-data";

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** "⌘K" on Apple devices, "Ctrl K" elsewhere. */
function useShortcutLabel() {
  return useSyncExternalStore(
    () => () => {},
    () => (isMac() ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );
}

/** Opens the palette on Cmd+K / Ctrl+K from anywhere in the app. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpen();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

/** Visible trigger for touch and mouse users (the shortcut is optional). */
export function SearchButton({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  const shortcut = useShortcutLabel();
  if (compact) {
    return (
      <Button variant="ghost" size="icon" onClick={onClick} aria-label="Search">
        <SearchIcon aria-hidden />
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full justify-start gap-2 text-muted-foreground"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <SearchIcon aria-hidden />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="rounded border bg-muted px-1.5 font-sans text-[11px] font-medium">
        {shortcut}
      </kbd>
    </Button>
  );
}

/**
 * Global search across contacts, companies and deals (plus pages). Arrow keys
 * move, Enter opens, Escape closes; cmdk handles the listbox semantics.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search PipelineHQ</DialogTitle>
        <DialogDescription className="sr-only">
          Find contacts, companies, deals and pages. Use the arrow keys to move
          through results and Enter to open one.
        </DialogDescription>
        {/* Mounted only while open, so its listeners only run when needed. */}
        {open && <PaletteResults onSelect={go} />}
      </DialogContent>
    </Dialog>
  );
}

function PaletteResults({ onSelect }: { onSelect: (href: string) => void }) {
  const data = useCrmData();
  const companyName = new Map(data.companies.map((c) => [c.id, c.name]));
  const itemClass = "gap-3";

  return (
    <Command
      label="Search contacts, companies and deals"
      className="rounded-none"
    >
      <CommandInput placeholder="Search contacts, companies and deals…" />
      <CommandList className="max-h-[min(60svh,26rem)]">
        <CommandEmpty>
          {data.loading
            ? "Loading…"
            : "No results. Try a name, company or deal."}
        </CommandEmpty>
        <CommandGroup heading="Contacts">
          {data.contacts.map((c) => {
            const name = `${c.firstName} ${c.lastName}`;
            const company = companyName.get(c.companyId) ?? "";
            return (
              <CommandItem
                key={c.id}
                value={`contact:${c.id}`}
                keywords={[name, c.email, company]}
                onSelect={() => onSelect(`/app/contacts/${c.id}`)}
                className={itemClass}
              >
                <UserIcon aria-hidden />
                <span className="truncate">{name}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {company}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Companies">
          {data.companies.map((c) => (
            <CommandItem
              key={c.id}
              value={`company:${c.id}`}
              keywords={[c.name, c.industry]}
              onSelect={() => onSelect(`/app/companies/${c.id}`)}
              className={itemClass}
            >
              <Building2Icon aria-hidden />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {c.industry}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Deals">
          {data.deals.map((d) => (
            <CommandItem
              key={d.id}
              value={`deal:${d.id}`}
              keywords={[d.title, companyName.get(d.companyId) ?? ""]}
              onSelect={() => onSelect(`/app/pipeline?deal=${d.id}`)}
              className={itemClass}
            >
              <KanbanSquareIcon aria-hidden />
              <span className="truncate">{d.title}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {STAGE_LABELS[d.stage]} · {formatCurrencyCompact(d.value)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Pages">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <CommandItem
              key={href}
              value={`page:${href}`}
              keywords={[label, "page", "go to"]}
              onSelect={() => onSelect(href)}
              className={cn(itemClass)}
            >
              <Icon aria-hidden />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
