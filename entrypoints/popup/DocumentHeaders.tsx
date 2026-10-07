import { Check, Copy, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Inspect } from '@/lib/config';
import { documentRequestItem, findHeader, type DocumentRequest } from '@/lib/document';

async function inspectedTabId(): Promise<number | undefined> {
  // e2e tests open the popup as a regular tab, so they point it at the page under test.
  const param = Number(new URLSearchParams(location.search).get('tabId'));
  if (param) return param;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

/** The active tab's latest document request; `undefined` while loading, `null` if none was captured. */
function useDocumentRequest() {
  const [request, setRequest] = useState<DocumentRequest | null>();

  useEffect(() => {
    let unwatch: (() => void) | undefined;
    let cancelled = false;

    void inspectedTabId().then(async (tabId) => {
      if (tabId === undefined) return setRequest(null);
      const item = documentRequestItem(tabId);
      const value = await item.getValue();
      if (cancelled) return;
      setRequest(value);
      unwatch = item.watch(setRequest);
    });

    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, []);

  return request;
}

/** Shows the configured headers of the page's document request. */
export function DocumentHeaders({ inspect }: { inspect: Inspect }) {
  const request = useDocumentRequest();
  if (request === undefined) return null;

  const showDirection = inspect.requestHeaders.length > 0 && inspect.responseHeaders.length > 0;
  const rows = [
    ...inspect.requestHeaders.map((name) => ({ direction: 'req', name, values: findHeader(request?.requestHeaders, name) })),
    ...inspect.responseHeaders.map((name) => ({ direction: 'res', name, values: findHeader(request?.responseHeaders, name) })),
  ];

  return (
    <section aria-label="Page headers" className="flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5 shrink-0" />
        {request ? (
          <>
            <span className="truncate" title={request.url}>
              {request.url}
            </span>
            {request.statusCode !== undefined && (
              <Badge variant="outline" className="ml-auto shrink-0 font-mono" aria-label="Status code">
                {request.statusCode}
              </Badge>
            )}
          </>
        ) : (
          <span>Reload the page to see its headers.</span>
        )}
      </div>

      {request && (
        <dl className="flex flex-col gap-1">
          {rows.map(({ direction, name, values }) => {
            const value = values.length ? values.join(', ') : undefined;
            return (
              <div key={`${direction}-${name}`} className="flex h-6 min-w-0 items-center gap-2 font-mono text-xs">
                {showDirection && (
                  <Badge variant="secondary" className="shrink-0 font-mono uppercase">
                    {direction}
                  </Badge>
                )}
                <dt className="shrink-0 text-muted-foreground">{name}</dt>
                <dd className="min-w-0 flex-1 truncate" title={value}>
                  {value ?? <span className="text-muted-foreground/60">not set</span>}
                </dd>
                {value !== undefined && <CopyButton value={value} label={`Copy ${name}`} />}
              </div>
            );
          })}
        </dl>
      )}
    </section>
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
    <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={copy} aria-label={label}>
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
