import { useState, type ReactNode } from 'react';
import Danger from '~icons/solar/danger-circle-linear';
import Eraser from '~icons/solar/eraser-linear';
import Incognito from '~icons/solar/incognito-linear';
import Pause from '~icons/solar/pause-linear';
import Play from '~icons/solar/play-linear';
import Restart from '~icons/solar/restart-linear';
import Settings from '~icons/solar/settings-linear';
import CheckCircle from '~icons/solar/check-circle-linear';
import icon from '@/assets/icon.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Config, Profile } from '@/lib/config';
import type { DocumentRequest } from '@/lib/document';
import { EXTENSION_OUTDATED, type ClearReport } from '@/lib/site';
import { groupProfiles, setProfileEnabled } from '@/lib/profiles';
import { cn } from '@/lib/utils';
import { DocumentHeaders } from './DocumentHeaders';
import { OptionPicker } from './OptionPicker';

const HEADER_LISTS = ['requestHeaders', 'responseHeaders'] as const;
type HeaderList = (typeof HEADER_LISTS)[number];

/**
 * The popup's contents, driven by props so the options page can preview a draft
 * config with the same markup the popup renders.
 */
export function Popup({
  config,
  paused,
  request,
  onConfigChange,
  onPausedChange,
  onOpenOptions,
  siteOrigin,
  onClearSiteData,
  onReloadExtension,
  sample = false,
}: {
  config: Config;
  paused: boolean;
  /** The page's document request; `undefined` while loading, `null` if none was captured. */
  request: DocumentRequest | null | undefined;
  onConfigChange: (config: Config) => void;
  onPausedChange: (paused: boolean) => void;
  onOpenOptions: () => void;
  /** The current page's origin; without one (browser pages, or sites Headering can't access) there's nothing to clear. */
  siteOrigin?: string;
  /**
   * Clears the page's cookies and storage, and with `reload` reloads it as a new visitor; the
   * buttons show when set and turned on in the config. Resolves with what the browser has afterwards.
   */
  onClearSiteData?: (reload: boolean) => Promise<ClearReport>;
  /** Reloads the extension, offered when its background is from an older build than the popup. */
  onReloadExtension?: () => void;
  /** The request is made up, as in the options page's preview, and is labelled as such. */
  sample?: boolean;
}) {
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<ClearResult>();
  const clearSiteData = async (reload: boolean) => {
    setClearing(true);
    setClearResult(undefined);
    try {
      const report = await onClearSiteData?.(reload);
      if (report) setClearResult({ reloaded: reload, ...report });
    } catch (err) {
      setClearResult({ error: (err as Error).message });
    } finally {
      setClearing(false);
    }
  };
  const host = siteOrigin && new URL(siteOrigin).host;
  const { profiles } = config;

  const toggle = (index: number, enabled: boolean) => onConfigChange(setProfileEnabled(config, index, enabled));

  const setHeaderValue = (index: number, list: HeaderList, headerIndex: number, value: string) =>
    onConfigChange({
      ...config,
      profiles: profiles.map((p, i) =>
        i === index ? { ...p, [list]: p[list].map((h, j) => (j === headerIndex ? { ...h, value } : h)) } : p,
      ),
    });

  const renderProfile = (index: number, grouped = false) => (
    <ProfileRow
      key={index}
      id={`profile-${index}`}
      profile={profiles[index]!}
      grouped={grouped}
      paused={paused}
      onToggle={(enabled) => toggle(index, enabled)}
      onHeaderValue={(list, h, value) => setHeaderValue(index, list, h, value)}
    />
  );

  return (
    // Chrome caps popups at 600px tall. Taller content makes the whole page scroll, and the
    // scrollbar's width then overflows the 360px layout and Chrome widens the popup. Keep the
    // page within the cap and scroll only the profile list.
    <div className="flex max-h-[600px] w-[360px] flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-4">
          <img src={icon} alt="" className="size-5" />
          <h1 className="text-sm font-semibold">Headering</h1>
          {paused && (
            <span className="inline-flex h-5 items-center gap-1 rounded-md bg-muted px-1.5 text-xs font-medium text-foreground">
              <Pause className="size-3" aria-hidden />
              Paused
            </span>
          )}
          <div className="ml-auto flex items-center">
            {onClearSiteData && config.clearSiteData?.clear && (
              <ClearButton
                label="Clear site data"
                host={host}
                disabled={clearing}
                onClick={() => void clearSiteData(false)}
                tooltip={`Clear cookies and storage for ${host}, without reloading. The page's scripts may set some again.`}
              >
                <Eraser />
              </ClearButton>
            )}
            {onClearSiteData && config.clearSiteData?.clearAndReload && (
              <ClearButton
                label="Clear site data and reload"
                host={host}
                disabled={clearing}
                onClick={() => void clearSiteData(true)}
                tooltip={`Reload as a new visitor: clears cookies and storage for ${host}`}
              >
                <Incognito />
              </ClearButton>
            )}
            {(profiles.length > 0 || paused) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPausedChange(!paused)}
                    aria-label="Pause all profiles"
                    aria-pressed={paused}
                    className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
                  >
                    {paused ? <Play /> : <Pause />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{paused ? 'Resume all profiles' : 'Pause all profiles'}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onOpenOptions} aria-label="Settings" className="text-muted-foreground">
                  <Settings />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage configuration</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {clearResult && <ClearResult result={clearResult} onReloadExtension={onReloadExtension} />}

        {/* What came back first: the page's status and the headers worth watching. */}
        {config.inspect && <DocumentHeaders inspect={config.inspect} request={request} sample={sample} />}

        {profiles.length ? (
          <div className="min-h-0 overflow-y-auto py-2">
            {groupProfiles(profiles).map((entry) =>
              entry.type === 'profile' ? (
                renderProfile(entry.index)
              ) : (
                <div
                  key={`group-${entry.name}`}
                  role="group"
                  aria-label={`${entry.name}, one at a time`}
                  className="mx-2 my-1 overflow-hidden rounded-lg border"
                >
                  <div className="flex items-baseline gap-2 bg-muted/40 px-[7px] py-1.5 text-xs">
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="shrink-0 text-muted-foreground">One at a time</span>
                  </div>
                  {entry.indexes.map((index) => renderProfile(index, true))}
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="px-4 pt-4 pb-5">
            <h2 className="text-sm leading-5 font-semibold">No profiles yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Import a configuration file to choose which headers to send.</p>
            <Button className="mt-3" onClick={onOpenOptions}>
              Import configuration
            </Button>
          </div>
        )}
    </div>
  );
}

function ClearButton({
  label,
  host,
  disabled,
  onClick,
  tooltip,
  children,
}: {
  label: string;
  /** The page's host; without one there's nothing to clear, and the tooltip says why. */
  host: string | undefined;
  disabled: boolean;
  onClick: () => void;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      {/* A disabled button gets no pointer events, so the wrapper shows the tooltip saying why. */}
      <TooltipTrigger asChild>
        <span tabIndex={host ? -1 : 0}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled || !host}
            aria-label={label}
            className="text-muted-foreground"
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        {host ? tooltip : "Nothing to clear here. On a website, check that Headering's site access in chrome://extensions includes it."}
      </TooltipContent>
    </Tooltip>
  );
}

type ClearResult = { error: string } | (ClearReport & { reloaded: boolean });

/** What clearing site data did; after a reload, judged by the cookies it actually sent. */
function ClearResult({ result, onReloadExtension }: { result: ClearResult; onReloadExtension?: () => void }) {
  if ('error' in result && result.error === EXTENSION_OUTDATED && onReloadExtension) {
    return (
      <Alert variant="destructive" className="mx-3 mt-3 w-auto shrink-0">
        <Danger />
        <AlertTitle>Headering needs a reload</AlertTitle>
        <AlertDescription>
          {result.error} Reload it, then open the popup again.
          <Button size="sm" className="mt-2" onClick={onReloadExtension}>
            <Restart /> Reload Headering
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if ('error' in result) {
    return (
      <Alert variant="destructive" className="mx-3 mt-3 w-auto shrink-0">
        <Danger />
        <AlertTitle>Couldn't clear site data</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }
  if (!result.reloaded) {
    const { removed = 0, setAgain = [] } = result;
    return (
      <Alert className="mx-3 mt-3 w-auto shrink-0">
        <CheckCircle className="text-success" />
        <AlertTitle>
          Removed {removed} {removed === 1 ? 'cookie' : 'cookies'} and the site's storage
        </AlertTitle>
        {setAgain.length ? (
          <AlertDescription>
            <p>Some are already back, set again by the page or, for a site you're signed in to, by Chrome:</p>
            <ul className="mt-1 flex flex-col gap-1">
              {setAgain.map(({ domain, names }) => (
                <li key={domain} className="text-xs break-all">
                  <span className="font-medium text-foreground">{domain}</span>{' '}
                  <span className="font-mono">{names.join(', ')}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        ) : (
          <AlertDescription>None have come back.</AlertDescription>
        )}
      </Alert>
    );
  }
  const { cookiesSent } = result;
  if (!cookiesSent) return null; // The reload wasn't seen, so there's nothing to report.
  return cookiesSent.length ? (
    <Alert variant="destructive" className="mx-3 mt-3 w-auto shrink-0">
      <Danger />
      <AlertTitle>The reload still sent cookies</AlertTitle>
      <AlertDescription className="font-mono text-xs break-all">{cookiesSent.join(', ')}</AlertDescription>
    </Alert>
  ) : (
    <Alert className="mx-3 mt-3 w-auto shrink-0">
      <CheckCircle className="text-success" />
      <AlertTitle>Reloaded as a new visitor</AlertTitle>
      <AlertDescription>The page loaded without any cookies.</AlertDescription>
    </Alert>
  );
}

function ProfileRow({
  id,
  profile,
  grouped,
  paused,
  onToggle,
  onHeaderValue,
}: {
  id: string;
  profile: Profile;
  /** In a group's block, where rows sit closer to its border and are divided by rules. */
  grouped: boolean;
  paused: boolean;
  onToggle: (enabled: boolean) => void;
  onHeaderValue: (list: HeaderList, headerIndex: number, value: string) => void;
}) {
  const sending = profile.enabled && !paused;

  return (
    // Inside a group's 8px inset and border, 7px keeps text and switches in line with ungrouped rows.
    <div className={cn('py-2 hover:bg-muted/40', grouped ? 'border-t px-[7px]' : 'px-4')}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block cursor-pointer truncate text-sm leading-5 font-medium">
            {profile.name}
          </label>
          {profile.domains && <p className="truncate text-xs text-muted-foreground">{profile.domains.join(', ')}</p>}
        </div>
        {/* Still toggleable while paused; grey shows what comes back on when resumed. */}
        <Switch
          id={id}
          checked={profile.enabled}
          onCheckedChange={onToggle}
          className={cn('mt-px', paused && 'data-checked:bg-held')}
        />
      </div>

      {HEADER_LISTS.flatMap((list) =>
        profile[list].map((header, h) => (
          // Headers have no id of their own, and the list only changes when a new config is applied.
          // oxlint-disable-next-line react/no-array-index-key
          <div key={`${list}-${h}`} className="mt-1">
            {header.options ? (
              <OptionPicker header={header} sending={sending} onChange={(value) => onHeaderValue(list, h, value)} />
            ) : (
              <code
                className={cn(
                  'block truncate font-mono text-xs leading-5 transition-colors duration-[90ms] ease-[steps(2)]',
                  sending ? 'text-sending' : 'text-muted-foreground',
                )}
              >
                {header.operation === 'remove' ? `− ${header.name}` : `+ ${header.name}: ${header.value}`}
              </code>
            )}
          </div>
        )),
      )}
    </div>
  );
}
