import type { ChangeEvent, DragEvent } from 'react';
import { Check, CircleAlert, Copy, Download, Upload } from 'lucide-react';
import icon from '@/assets/icon.svg';
import { Popup } from '@/components/popup/Popup';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { parseConfig, serializeConfig, type Config, type InspectHeader } from '@/lib/config';
import type { DocumentRequest } from '@/lib/document';
import { configItem, pausedItem } from '@/lib/settings';
import { cn } from '@/lib/utils';

function App() {
  const [saved, setSaved] = useState<Config | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
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

  useEffect(() => {
    pausedItem.getValue().then(setPaused);
    return pausedItem.watch(setPaused);
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
              <CardDescription>How the popup will look once applied.</CardDescription>
            </CardHeader>
            <CardContent>
              {result.ok ? (
                <Preview config={result.config} paused={paused} />
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

/** The popup as it will look with this config. Inert, so nothing changes until the config is applied. */
function Preview({ config, paused }: { config: Config; paused: boolean }) {
  const request = useMemo(() => sampleRequest(config), [config]);
  const noop = () => {};

  return (
    <div inert className="mx-auto w-fit overflow-hidden rounded-xl border bg-background shadow-sm">
      <Popup
        config={config}
        paused={paused}
        request={request}
        onConfigChange={noop}
        onPausedChange={noop}
        onOpenOptions={noop}
        // So the clear buttons the config turns on show too.
        siteOrigin={new URL(request.url).origin}
        onClearSiteData={async () => ({})}
      />
    </div>
  );
}

/** A made-up page load so inspected headers show, each with a value its tones would colour. */
function sampleRequest(config: Config): DocumentRequest {
  const sample = (header: InspectHeader) => {
    const match = header.tones?.[0]?.match ?? 'example';
    return { name: header.name, value: /^[1-5]xx$/i.test(match) ? `${match[0]}00` : match };
  };
  const domain = config.profiles.find((profile) => profile.domains)?.domains?.[0] ?? 'example.com';

  return {
    requestId: 'preview',
    url: `https://${domain}/`,
    statusCode: 200,
    requestHeaders: config.inspect?.requestHeaders.map(sample) ?? [],
    responseHeaders: config.inspect?.responseHeaders.map(sample) ?? [],
  };
}

export default App;
