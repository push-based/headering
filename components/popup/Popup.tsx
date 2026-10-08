import { Fragment } from 'react';
import { FileJson, Pause, Play, Settings } from 'lucide-react';
import icon from '@/assets/icon.svg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Config, Profile } from '@/lib/config';
import type { DocumentRequest } from '@/lib/document';
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
  onReload,
}: {
  config: Config;
  paused: boolean;
  /** The page's document request; `undefined` while loading, `null` if none was captured. */
  request: DocumentRequest | null | undefined;
  onConfigChange: (config: Config) => void;
  onPausedChange: (paused: boolean) => void;
  onOpenOptions: () => void;
  onReload?: () => void;
}) {
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

      {config.inspect && <DocumentHeaders inspect={config.inspect} request={request} onReload={onReload} />}

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
                className="rounded-lg border"
              >
                <div className="px-3 pt-2 text-xs font-medium">{entry.name}</div>
                <div className="p-1">
                  {entry.indexes.map((index, n) => (
                    <Fragment key={index}>
                      {n > 0 && <ItemSeparator className="mx-2 my-1 w-auto" />}
                      {renderProfile(index, true)}
                    </Fragment>
                  ))}
                </div>
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
        grouped && 'px-2',
        profile.enabled && !paused && (grouped ? 'bg-muted' : 'border-primary/40 bg-muted/50'),
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
