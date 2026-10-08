import { Check, Copy, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Inspect, Tone } from '@/lib/config';
import { findHeader, toneOf, worstTone, type DocumentRequest } from '@/lib/document';
import { cn } from '@/lib/utils';

const TONE_TAG: Record<Tone, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

// The card's edge follows the worst tone so a problem shows before any row is read.
const TONE_BORDER: Record<Tone, string> = {
  success: '',
  warning: 'border-yellow-400 dark:border-yellow-500/45',
  error: 'border-red-300 dark:border-red-500/50',
};

/** Long values like request ids keep both ends readable; the full value is in the title and copied. */
const shorten = (value: string) => (value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-5)}` : value);

/** Shows the configured headers of the page's document request. */
export function DocumentHeaders({
  inspect,
  request,
  onReload,
}: {
  inspect: Inspect;
  /** `undefined` while loading, `null` if none was captured. */
  request: DocumentRequest | null | undefined;
  onReload?: () => void;
}) {

  const showDirection = inspect.requestHeaders.length > 0 && inspect.responseHeaders.length > 0;
  const rows = [
    ...inspect.requestHeaders.map((header) => ({ direction: 'req', header, values: findHeader(request?.requestHeaders, header.name) })),
    ...inspect.responseHeaders.map((header) => ({ direction: 'res', header, values: findHeader(request?.responseHeaders, header.name) })),
  ].map((row) => ({ ...row, tone: toneOf(row.header.tones, row.values) }));
  const prefix = sharedPrefix(rows.map((row) => row.header.name));

  return (
    <section aria-label="Page headers" className="shrink-0 px-3 pt-3">
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-muted/50',
          request && TONE_BORDER[worstTone(rows.map((row) => row.tone)) ?? 'success'],
        )}
      >
        {request === undefined ? (
          <Skeleton rows={rows.length} />
        ) : request === null ? (
          <div className="flex items-center gap-2.5 py-2.5 pr-2 pl-3">
            <p className="flex-1 text-xs text-muted-foreground">Headers are read when the page loads.</p>
            {onReload && (
              <Button variant="outline" size="sm" className="bg-background" onClick={onReload}>
                <RotateCw /> Reload page
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex h-10 min-w-0 items-center gap-2 border-b px-2.5">
              {request.statusCode !== undefined && (
                <Badge variant="outline" className="h-5 rounded-md px-1.5 font-mono text-[11px] font-semibold" aria-label="Status code">
                  {request.statusCode}
                </Badge>
              )}
              <PageUrl url={request.url} />
            </div>
            <dl className="flex flex-col p-1">
              {rows.map(({ direction, header, values, tone }) => {
                const value = values.length ? values.join(', ') : undefined;
                const name = header.name.slice(prefix.length);
                return (
                  <div
                    key={`${direction}-${header.name}`}
                    className="group/row flex h-8 min-w-0 items-center gap-2.5 rounded-lg pr-0.5 pl-2 font-mono hover:bg-background hover:ring-1 hover:ring-border dark:hover:bg-muted dark:hover:ring-0"
                  >
                    {showDirection && (
                      <Badge variant="secondary" className="-mr-1 h-4 px-1 font-mono text-[10px] uppercase">
                        {direction}
                      </Badge>
                    )}
                    {/* The name stays whole for screen readers; the shared prefix is just quieter. */}
                    <dt className="w-[124px] shrink-0 truncate text-[11.5px]" title={header.name}>
                      <span className="text-muted-foreground">{prefix}</span>
                      <span className="font-medium text-foreground/85">{name}</span>
                    </dt>
                    <dd className="flex min-w-0 flex-1 text-xs" title={value} data-tone={tone}>
                      {value === undefined ? (
                        <span className="text-muted-foreground">not set</span>
                      ) : tone ? (
                        <span className={cn('inline-flex h-[22px] min-w-0 items-center gap-1.5 rounded-md pr-2 pl-[7px] font-medium', TONE_TAG[tone])}>
                          <span className="size-[7px] shrink-0 rounded-full bg-current" aria-hidden />
                          <span className="truncate">{value}</span>
                        </span>
                      ) : (
                        <span className="truncate">{shorten(value)}</span>
                      )}
                    </dd>
                    {value !== undefined && <CopyButton value={value} label={`Copy ${header.name}`} />}
                  </div>
                );
              })}
            </dl>
          </>
        )}
      </div>
    </section>
  );
}

/** Host first, since that's what identifies the page; path and query trail off. */
function PageUrl({ url }: { url: string }) {
  let host = url;
  let rest = '';
  try {
    const parsed = new URL(url);
    host = parsed.host;
    rest = `${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}`;
  } catch {
    // Not a URL we can split; show it whole.
  }

  return (
    <span className="flex min-w-0 flex-1 text-xs whitespace-nowrap" title={url}>
      <span className="max-w-[75%] shrink-0 truncate font-medium">{host}</span>
      {rest && <span className="min-w-0 truncate text-muted-foreground">{rest}</span>}
    </span>
  );
}

/** A common prefix like "x-ssr-", only when every name has it and it ends on a dash. */
function sharedPrefix(names: string[]): string {
  if (names.length < 2) return '';
  let prefix = names[0]!;
  for (const name of names) {
    while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  const end = prefix.lastIndexOf('-');
  return end > 0 ? prefix.slice(0, end + 1) : '';
}

/** Same shape as the loaded card so the popup doesn't jump when headers arrive. */
function Skeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading page headers">
      <div className="flex h-10 items-center gap-2 border-b px-2.5">
        <span className="h-5 w-9 animate-pulse rounded-md bg-muted" />
        <span className="h-2.5 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col p-1">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-8 items-center gap-2.5 px-2">
            <span className="h-2.5 w-24 animate-pulse rounded bg-muted" />
            <span className="h-2.5 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      // Hidden until the row is hovered or the button focused, so the card isn't a column of icons.
      className={cn(
        'shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100',
        copied && 'text-green-700 opacity-100 dark:text-green-400',
      )}
      onClick={copy}
      aria-label={label}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
