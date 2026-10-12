import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The config's textarea with a line-number gutter. Lines don't wrap, so each number stays
 * level with its line, and the gutter marks the line a syntax error points at.
 */
export function JsonEditor({
  value,
  invalidLine,
  dragging,
  className,
  onScroll,
  ...props
}: ComponentProps<'textarea'> & { value: string; invalidLine?: number; dragging: boolean }) {
  const [scrollTop, setScrollTop] = useState(0);
  const lines = value.split('\n').length;

  return (
    <div
      className={cn(
        'flex h-[max(480px,calc(100svh-15rem))] min-h-60 resize-y overflow-hidden rounded-lg border bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30',
        props['aria-invalid'] && 'border-destructive focus-within:border-destructive focus-within:ring-destructive/20',
        dragging && 'border-primary bg-accent ring-3 ring-ring/30',
        className,
      )}
    >
      <div aria-hidden className="w-12 shrink-0 overflow-hidden border-r bg-muted/40 py-4 font-mono text-xs leading-5 select-none">
        <div style={{ transform: `translateY(${-scrollTop}px)` }}>
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className={cn(
                'pr-3 text-right text-muted-foreground',
                i + 1 === invalidLine && 'bg-error-tag font-semibold text-error-tag-foreground',
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <textarea
        value={value}
        wrap="off"
        spellCheck={false}
        onScroll={(e) => {
          setScrollTop(e.currentTarget.scrollTop);
          onScroll?.(e);
        }}
        className="min-w-0 flex-1 resize-none bg-transparent py-4 pr-4 pl-3 font-mono text-xs leading-5 outline-none"
        {...props}
      />
    </div>
  );
}
