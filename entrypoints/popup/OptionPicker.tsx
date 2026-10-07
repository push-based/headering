import type { KeyboardEvent } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Header } from '@/lib/config';

/** Ranks label prefix matches first (so "at" → AT), then label and value substrings. */
function matchOption(label: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLowerCase();
  const name = label.toLowerCase();
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 0.6;
  if (keywords.some((k) => k.toLowerCase().includes(query))) return 0.3;
  return 0;
}

export function OptionPicker({ header, onChange }: { header: Header; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = header.options?.find((o) => o.value === header.value);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  // Typing on the trigger opens the list and starts searching. Keys can still land
  // here until focus moves into the search input, so append rather than replace
  // (search is reset whenever the list closes).
  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 && e.key !== ' ') {
      e.preventDefault();
      setSearch((current) => current + e.key);
      setOpen(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="flex w-full items-center gap-2">
      <code className="shrink-0 font-mono text-xs text-muted-foreground">{header.name}</code>
      <Popover open={open} onOpenChange={setOpenState}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            aria-label={header.name}
            className="min-w-0 flex-1 justify-between font-normal"
            onKeyDown={onTriggerKeyDown}
          >
            <span className="flex min-w-0 items-baseline gap-1.5 truncate">
              {selected?.label}
              <span className="font-mono text-xs text-muted-foreground">{selected?.value}</span>
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-(--radix-popover-trigger-width) min-w-60 p-0"
          // Radix selects the input's text on focus, so the next key would replace
          // the one that opened the list. Focus it ourselves with the caret at the end.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const input = inputRef.current;
            input?.focus();
            input?.setSelectionRange(input.value.length, input.value.length);
          }}
        >
          <Command filter={matchOption} defaultValue={selected?.label}>
            <CommandInput
              placeholder="Type to search…"
              value={search}
              onValueChange={setSearch}
              ref={inputRef}
            />
            <CommandList className="max-h-56">
              <CommandEmpty>No matches.</CommandEmpty>
              {/* Grid with subgrid rows so the label column fits the longest label and values stay aligned. */}
              <CommandGroup className="**:[[cmdk-group-items]]:grid **:[[cmdk-group-items]]:grid-cols-[auto_1fr_auto]">
                {header.options?.map((option) => (
                  <CommandItem
                    key={option.label}
                    value={option.label}
                    keywords={[option.value]}
                    data-checked={option.value === header.value}
                    className="col-span-3 grid grid-cols-subgrid"
                    onSelect={() => {
                      onChange(option.value);
                      setOpenState(false);
                    }}
                  >
                    <span className="font-medium whitespace-nowrap">{option.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{option.value}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
