import { Fragment, useState, type ReactNode } from 'react';
import { Eraser, FileJson, Pause, Play, RotateCw, Settings } from 'lucide-react';
import icon from '@/assets/icon.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Config, Profile } from '@/lib/config';
import type { DocumentRequest } from '@/lib/document';
import { EXTENSION_OUTDATED, type ClearReport } from '@/lib/site';
import { groupProfiles, setProfileEnabled } from '@/lib/profiles';
import { cn } from '@/lib/utils';
import { DocumentHeaders } from './DocumentHeaders';
import { OptionPicker } from './OptionPicker';
import { RotateCwEraser } from './RotateCwEraser';

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

  const toggle = (index: number, enabled: boolean) => onConfigChange(setProfileEnabled(config, index, enabled));

  const setHeaderValue = (index: number, list: HeaderList, headerIndex: number, value: string) =>
    onConfigChange({
      ...config,
      profiles: config.profiles.map((p, i) =>
        i === index ? { ...p, [list]: p[list].map((h, j) => (j === headerIndex ? { ...h, value } : h)) } : p,
      ),
    });

  const renderProfile = (index: number, grouped = false) => (
    <ProfileItem
      key={index}
      id={`profile-${index}`}
      profile={config.profiles[index]!}
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
    <div className="flex max-h-[600px] w-[360px] flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <img src={icon} alt="" className="size-5" />
        <h1 className="font-heading text-base font-semibold">Headering</h1>
        {paused && (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          >
            Paused
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
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
              <RotateCwEraser />
            </ClearButton>
          )}
          {(config.profiles.length > 0 || paused) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onPausedChange(!paused)}
                  aria-label="Pause all profiles"
                  aria-pressed={paused}
                  className="aria-pressed:bg-muted"
                >
                  {paused ? <Play /> : <Pause />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{paused ? 'Resume all profiles' : 'Pause all profiles'}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onOpenOptions} aria-label="Settings">
                <Settings />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manage configuration</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {clearResult && <ClearResult result={clearResult} onReloadExtension={onReloadExtension} />}

      {config.inspect && <DocumentHeaders inspect={config.inspect} request={request} />}

      {config.profiles.length ? (
        <ItemGroup className="min-h-0 gap-2 overflow-y-auto p-3">
          {groupProfiles(config.profiles).map((entry) =>
            entry.type === 'profile' ? (
              renderProfile(entry.index)
            ) : (
              <div
                key={`group-${entry.name}`}
                role="group"
                aria-label={`${entry.name}, one at a time`}
                className="overflow-hidden rounded-lg border"
              >
                <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {entry.name}
                </div>
                {entry.indexes.map((index, n) => (
                  <Fragment key={index}>
                    {n > 0 && <ItemSeparator className="my-0" />}
                    {renderProfile(index, true)}
                  </Fragment>
                ))}
              </div>
            ),
          )}
        </ItemGroup>
      ) : (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileJson />
            </EmptyMedia>
            <EmptyTitle>No profiles yet</EmptyTitle>
            <EmptyDescription>Import a configuration file to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onOpenOptions}>Import configuration</Button>
          </EmptyContent>
        </Empty>
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
          <Button variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled || !host} aria-label={label}>
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
      <Alert variant="destructive" className="mx-3 mt-3 w-auto">
        <AlertTitle>Headering needs a reload</AlertTitle>
        <AlertDescription>
          {result.error} Reload it, then open the popup again.
          <Button size="sm" className="mt-2" onClick={onReloadExtension}>
            <RotateCw /> Reload Headering
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if ('error' in result) {
    return (
      <Alert variant="destructive" className="mx-3 mt-3 w-auto">
        <AlertTitle>Couldn't clear site data</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }
  if (!result.reloaded) {
    const { removed = 0, setAgain = [] } = result;
    return (
      <Alert className="mx-3 mt-3 w-auto">
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
    <Alert variant="destructive" className="mx-3 mt-3 w-auto">
      <AlertTitle>The reload still sent cookies</AlertTitle>
      <AlertDescription className="font-mono text-xs break-all">{cookiesSent.join(', ')}</AlertDescription>
    </Alert>
  ) : (
    <Alert className="mx-3 mt-3 w-auto">
      <AlertTitle>Reloaded as a new visitor</AlertTitle>
      <AlertDescription>The page loaded without any cookies.</AlertDescription>
    </Alert>
  );
}

function ProfileItem({
  id,
  profile,
  grouped,
  paused,
  onToggle,
  onHeaderValue,
}: {
  id: string;
  profile: Profile;
  grouped: boolean;
  paused: boolean;
  onToggle: (enabled: boolean) => void;
  onHeaderValue: (list: HeaderList, headerIndex: number, value: string) => void;
}) {
  return (
    <Item
      variant={grouped ? 'default' : 'outline'}
      size="sm"
      className={cn(
        grouped && 'rounded-none',
        profile.enabled && !paused && (grouped ? 'bg-muted/50' : 'border-primary/40 bg-muted/50'),
      )}
    >
      <ItemContent className="min-w-0">
        <ItemTitle>
          <label htmlFor={id} className="cursor-pointer">
            {profile.name}
          </label>
        </ItemTitle>
        {profile.domains && (
          <ItemDescription className="truncate text-xs">{profile.domains.join(', ')}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        {/* Still toggleable while paused; grey shows what comes back on when resumed. */}
        <Switch
          id={id}
          checked={profile.enabled}
          onCheckedChange={onToggle}
          className={cn(paused && 'data-checked:bg-muted-foreground/60')}
        />
      </ItemActions>

      {HEADER_LISTS.flatMap((list) =>
        profile[list].map((header, h) => (
          // Headers have no id of their own, and the list only changes when a new config is applied.
          // oxlint-disable-next-line react/no-array-index-key
          <ItemFooter key={`${list}-${h}`} className="w-full">
            {header.options ? (
              <OptionPicker header={header} onChange={(value) => onHeaderValue(list, h, value)} />
            ) : (
              <code className="truncate font-mono text-xs text-muted-foreground">
                {header.operation === 'remove' ? `remove ${header.name}` : `${header.name}: ${header.value}`}
              </code>
            )}
          </ItemFooter>
        )),
      )}
    </Item>
  );
}
