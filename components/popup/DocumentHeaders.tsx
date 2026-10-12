import ArrowLeft from '~icons/solar/arrow-left-linear';
import ArrowRight from '~icons/solar/arrow-right-linear';
import CopyCheck from '~icons/solar/copy-check-linear';
import CopyIcon from '~icons/solar/copy-linear';
import { Button } from '@/components/ui/button';
import type { Inspect, Tone } from '@/lib/config';
import { findHeader, toneOf, worstTone, type DocumentRequest } from '@/lib/document';
import { cn } from '@/lib/utils';

export const TONE_TAG: Record<Tone, string> = {
  success: 'bg-success-tag text-success-tag-foreground',
  warning: 'bg-warning-tag text-warning-tag-foreground',
  error: 'bg-error-tag text-error-tag-foreground',
};

const TONE_DOT: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

/** Long values like request ids keep both ends readable; the full value is in the title and copied. */
const shorten = (value: string) => (value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-5)}` : value);

/**
 * The page's document request as it came back, with the configured headers. Leads the popup,
 * and its marker takes the worst tone, so a problem shows before any row is read.
 */
export function DocumentHeaders({
  inspect,
  request,
  sample = false,
}: {
  inspect: Inspect;
  /** `undefined` while loading, `null` if none was captured. */
  request: DocumentRequest | null | undefined;
  /** The request is made up for a preview, so it says so. */
  sample?: boolean;
}) {
  const showDirection = inspect.requestHeaders.length > 0 && inspect.responseHeaders.length > 0;
  const rows = [
    ...inspect.requestHeaders.map((header) => ({ direction: 'req' as const, header, values: findHeader(request?.requestHeaders, header.name) })),
    ...inspect.responseHeaders.map((header) => ({ direction: 'res' as const, header, values: findHeader(request?.responseHeaders, header.name) })),
  ].map((row) => ({ ...row, tone: toneOf(row.header.tones, row.values) }));
  const prefix = sharedPrefix(rows.map((row) => row.header.name));
  const worst = request ? worstTone(rows.map((row) => row.tone)) : undefined;

  return (
    <section aria-label="Page headers" className="shrink-0 border-b bg-card pb-2">
      {request === undefined ? (
        <Skeleton rows={rows.length} />
      ) : request === null ? (
        <p className="px-4 pt-3 pb-1 text-xs leading-5 text-muted-foreground">Headers are read when the page loads.</p>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2 px-4 pt-3 pb-1">
            {worst && (
              <span className={cn('size-2 shrink-0 rounded-full', TONE_DOT[worst])}>
                <span className="sr-only">Worst tone: {worst}</span>
              </span>
            )}
            {request.statusCode !== undefined && (
              <span
                aria-label="Status code"
                className="inline-flex h-5 shrink-0 items-center rounded-md border bg-background px-1.5 font-mono text-xs font-semibold"
              >
                {request.statusCode}
              </span>
            )}
            <PageUrl url={request.url} />
            {sample && <span className="shrink-0 text-xs text-muted-foreground">Sample response</span>}
          </div>
          <dl className="flex flex-col px-2">
            {rows.map(({ direction, header, values, tone }) => {
              const value = values.length ? values.join(', ') : undefined;
              const name = header.name.slice(prefix.length);
              const Direction = direction === 'req' ? ArrowRight : ArrowLeft;
              return (
                <div
                  key={`${direction}-${header.name}`}
                  className="group/row flex h-8 min-w-0 items-center gap-2 rounded-md pl-2 font-mono hover:bg-muted/60"
                >
                  {showDirection && (
                    <span className="flex shrink-0 text-muted-foreground">
                      <Direction className="size-3" aria-hidden />
                      <span className="sr-only">{direction === 'req' ? 'Request' : 'Response'}</span>
                    </span>
                  )}
                  {/* The name stays whole for screen readers; the shared prefix is just quieter. */}
                  <dt className="w-[124px] shrink-0 truncate text-xs" title={header.name}>
                    <span className="text-muted-foreground">{prefix}</span>
                    <span className="text-foreground">{name}</span>
                  </dt>
                  <dd className="flex min-w-0 flex-1 text-xs" title={value} data-tone={tone}>
                    {value === undefined ? (
                      <span className="text-muted-foreground italic">not set</span>
                    ) : tone ? (
                      <span className={cn('inline-flex h-5 min-w-0 items-center gap-1.5 rounded-md px-1.5 font-medium', TONE_TAG[tone])}>
                        <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
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
    <span className="flex min-w-0 flex-1 text-sm leading-5 whitespace-nowrap" title={url}>
      <span className="max-w-[75%] shrink-0 truncate font-medium">{host}</span>
      {rest && <span className="min-w-0 truncate font-mono text-xs leading-5 text-muted-foreground">{rest}</span>}
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

/** Same shape as the loaded rows so the popup doesn't jump when headers arrive. */
function Skeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading page headers">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="h-5 w-9 animate-pulse rounded-md bg-muted" />
        <span className="h-2.5 w-40 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="flex flex-col px-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-8 items-center gap-2">
            <span className="h-2.5 w-24 animate-pulse rounded-sm bg-muted" />
            <span className="h-2.5 w-20 animate-pulse rounded-sm bg-muted" />
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
      // Hidden until the row is hovered or the button focused, so the list isn't a column of icons.
      className={cn(
        'shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100',
        copied && 'text-success opacity-100',
      )}
      onClick={copy}
      aria-label={label}
    >
      {copied ? <CopyCheck /> : <CopyIcon />}
    </Button>
  );
}
