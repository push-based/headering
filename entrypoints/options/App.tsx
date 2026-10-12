import type { ChangeEvent, DragEvent } from 'react';
import CheckCircle from '~icons/solar/check-circle-linear';
import CopyIcon from '~icons/solar/copy-linear';
import Danger from '~icons/solar/danger-circle-linear';
import ExportIcon from '~icons/solar/export-linear';
import ImportIcon from '~icons/solar/import-linear';
import icon from '@/assets/icon.svg';
import { Popup } from '@/components/popup/Popup';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorLine, parseConfig, serializeConfig, type Config, type InspectHeader } from '@/lib/config';
import type { DocumentRequest } from '@/lib/document';
import { configItem, pausedItem } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { JsonEditor } from './JsonEditor';

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
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={icon} alt="" className="size-8" />
            <div>
              <h1 className="text-lg leading-7 font-semibold">Headering</h1>
              <p className="text-sm text-muted-foreground">Import, edit and share header profiles as JSON.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <ImportIcon /> Import file
            </Button>
            <Button variant="outline" onClick={exportFile}>
              <ExportIcon /> Export
            </Button>
            <Button variant="outline" onClick={copy}>
              <CopyIcon /> Copy JSON
            </Button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onFileChange} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-[minmax(0,1fr)] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_362px]">
        <section aria-labelledby="config-title" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="config-title" className="font-mono text-sm font-semibold">
                Configuration
              </h2>
              <p className="text-sm text-muted-foreground">Paste, edit, or drop a .json file below.</p>
            </div>
            {result.ok ? (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-success-tag px-2 text-xs font-medium text-success-tag-foreground">
                <CheckCircle className="size-4" /> Valid
              </span>
            ) : (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-error-tag px-2 text-xs font-medium text-error-tag-foreground">
                <Danger className="size-4" /> {result.errors.length} {result.errors.length === 1 ? 'error' : 'errors'}
              </span>
            )}
          </div>
          <JsonEditor
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // A note like "Configuration applied." no longer describes an edited draft.
              setStatus('');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            aria-label="Configuration JSON"
            aria-invalid={!result.ok}
            invalidLine={result.ok ? undefined : errorLine(result.errors, text)}
            dragging={dragging}
          />
        </section>

        <section aria-labelledby="preview-title" className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 id="preview-title" className="font-mono text-sm font-semibold">
              Preview
            </h2>
            <p className="text-sm text-muted-foreground">How the popup will look once applied.</p>
          </div>
          {result.ok ? (
            <Preview config={result.config} paused={paused} />
          ) : (
            <Alert variant="destructive">
              <Danger />
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
        </section>
      </main>

      <footer className="sticky bottom-0 border-t bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:px-6">
          <span role="status" className={cn('mr-auto text-sm', changed && !status ? 'text-foreground' : 'text-muted-foreground')}>
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
    // Narrower than the popup, the preview scrolls sideways rather than squeezing it.
    <div inert className="max-w-full overflow-x-auto rounded-xl border bg-background shadow-[0_4px_16px_-4px_rgb(13_18_28/0.12)] lg:w-fit">
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
        sample
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
