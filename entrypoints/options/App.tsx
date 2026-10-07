import type { ChangeEvent, DragEvent } from 'react';
import { Check, CircleAlert, Copy, Download, Eye, Globe, Link2, TriangleAlert, Upload } from 'lucide-react';
import icon from '@/assets/icon.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemTitle } from '@/components/ui/item';
import { Textarea } from '@/components/ui/textarea';
import { parseConfig, serializeConfig, type Config, type Header } from '@/lib/config';
import { configItem } from '@/lib/settings';
import { cn } from '@/lib/utils';

function App() {
  const [saved, setSaved] = useState<Config | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    configItem.getValue().then((config) => {
      setSaved(config);
      setText(serializeConfig(config));
    });

    // Pick up changes made elsewhere (e.g. popup toggles) unless the user has unsaved edits.
    return configItem.watch((next, prev) => {
      setSaved(next);
      setText((current) => (current === serializeConfig(prev) ? serializeConfig(next) : current));
    });
  }, []);

  const result = useMemo(() => parseConfig(text), [text]);

  if (!saved) return null;

  const changed = text !== serializeConfig(saved);
  const canApply = result.ok && serializeConfig(result.config) !== serializeConfig(saved);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setStatus(`Loaded ${file.name}. Review the preview, then apply.`);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void loadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void loadFile(e.dataTransfer.files[0]);
  };

  const apply = async () => {
    if (!result.ok) return;
    await configItem.setValue(result.config);
    setText(serializeConfig(result.config));
    setStatus('Configuration applied.');
  };

  const discard = () => {
    setText(serializeConfig(saved));
    setStatus('');
  };

  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([serializeConfig(saved)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'headering-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(serializeConfig(saved));
    setStatus('Copied to clipboard.');
  };

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={icon} alt="" className="size-10" />
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">Headering</h1>
              <p className="text-muted-foreground">Import, edit and share header profiles as JSON.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload /> Import file
            </Button>
            <Button variant="outline" onClick={exportFile}>
              <Download /> Export
            </Button>
            <Button variant="outline" onClick={copy}>
              <Copy /> Copy
            </Button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onFileChange} />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Paste, edit, or drop a .json file below.</CardDescription>
              <CardAction>
                {result.ok ? (
                  <Badge variant="secondary">
                    <Check /> Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <CircleAlert /> {result.errors.length} {result.errors.length === 1 ? 'error' : 'errors'}
                  </Badge>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              <Textarea
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                aria-label="Configuration JSON"
                aria-invalid={!result.ok}
                className={cn(
                  'field-sizing-fixed h-[560px] resize-y font-mono text-xs leading-relaxed md:text-xs',
                  dragging && 'border-primary ring-3 ring-primary/30',
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>What will be applied, profile by profile.</CardDescription>
            </CardHeader>
            <CardContent>
              {result.ok ? (
                <Preview config={result.config} />
              ) : (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertTitle>This configuration can't be applied</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4 font-mono text-xs">
                      {result.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
          <span role="status" className="mr-auto text-sm text-muted-foreground">
            {status || (changed ? 'You have unsaved changes.' : 'Up to date.')}
          </span>
          <Button variant="outline" disabled={!changed} onClick={discard}>
            Discard
          </Button>
          <Button disabled={!canApply} onClick={apply}>
            Apply
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Preview({ config }: { config: Config }) {
  const inspected = [
    ...(config.inspect?.requestHeaders.map((name) => ({ direction: 'request' as const, name })) ?? []),
    ...(config.inspect?.responseHeaders.map((name) => ({ direction: 'response' as const, name })) ?? []),
  ];

  return (
    <ItemGroup className="gap-2">
      {inspected.length > 0 && (
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>
              <Eye className="size-4" /> Shown in the popup
            </ItemTitle>
            <ItemDescription>Read from the current page's document request.</ItemDescription>
          </ItemContent>
          <ItemFooter className="flex-col items-stretch gap-1.5">
            {inspected.map(({ direction, name }) => (
              <div key={`${direction}-${name}`} className="flex min-w-0 items-center gap-2 text-xs">
                <DirectionBadge direction={direction} />
                <code className="truncate font-mono">{name}</code>
              </div>
            ))}
          </ItemFooter>
        </Item>
      )}
      {!config.profiles.length && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No profiles</EmptyTitle>
            <EmptyDescription>Add a profile to the JSON to see it here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {config.profiles.map((profile, index) => (
        <Item key={index} variant="outline" className={cn(!profile.enabled && 'opacity-60')}>
          <ItemContent>
            <ItemTitle>
              {profile.name}
              {!profile.enabled && <Badge variant="outline">Off</Badge>}
              {profile.group !== undefined && (
                <Badge variant="secondary">
                  <Link2 /> {profile.group} · one at a time
                </Badge>
              )}
            </ItemTitle>
            <ItemDescription className="flex items-center gap-1.5">
              {profile.domains ? (
                <>
                  <Globe className="size-3.5" /> {profile.domains.join(', ')}
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                  <TriangleAlert className="size-3.5" /> Applies to every site
                </span>
              )}
            </ItemDescription>
          </ItemContent>
          <ItemFooter className="flex-col items-stretch gap-1.5">
            {profile.requestHeaders.map((h, i) => (
              <HeaderLine key={`req-${i}`} direction="request" header={h} />
            ))}
            {profile.responseHeaders.map((h, i) => (
              <HeaderLine key={`res-${i}`} direction="response" header={h} />
            ))}
          </ItemFooter>
        </Item>
      ))}
    </ItemGroup>
  );
}

function HeaderLine({ direction, header }: { direction: 'request' | 'response'; header: Header }) {
  const selectedLabel = header.options?.find((o) => o.value === header.value)?.label;

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <DirectionBadge direction={direction} />
      <code className="truncate font-mono">
        {header.operation === 'remove' ? (
          <>
            <span className="text-destructive">remove</span> {header.name}
          </>
        ) : (
          <>
            {header.name}: <span className="text-muted-foreground">{header.value}</span>
          </>
        )}
      </code>
      {header.options && (
        <Badge variant="outline" className="ml-auto shrink-0">
          {selectedLabel} · {header.options.length} options
        </Badge>
      )}
    </div>
  );
}

function DirectionBadge({ direction }: { direction: 'request' | 'response' }) {
  return (
    <Badge variant="secondary" className="w-16 shrink-0 font-mono uppercase">
      {direction === 'request' ? 'req' : 'res'}
    </Badge>
  );
}

export default App;
