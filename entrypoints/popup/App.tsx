import { Fragment } from 'react';
import { FileJson, Link2, Settings } from 'lucide-react';
import icon from '@/assets/icon.svg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Config, Profile } from '@/lib/config';
import { groupProfiles, setProfileEnabled } from '@/lib/profiles';
import { configItem } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { DocumentHeaders } from './DocumentHeaders';
import { OptionPicker } from './OptionPicker';

const HEADER_LISTS = ['requestHeaders', 'responseHeaders'] as const;
type HeaderList = (typeof HEADER_LISTS)[number];

function App() {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    configItem.getValue().then(setConfig);
    return configItem.watch(setConfig);
  }, []);

  if (!config) return null;

  const activeCount = config.profiles.filter((p) => p.enabled).length;

  const toggle = (index: number, enabled: boolean) => configItem.setValue(setProfileEnabled(config, index, enabled));

  const setHeaderValue = (index: number, list: HeaderList, headerIndex: number, value: string) =>
    configItem.setValue({
      ...config,
      profiles: config.profiles.map((p, i) =>
        i === index ? { ...p, [list]: p[list].map((h, j) => (j === headerIndex ? { ...h, value } : h)) } : p,
      ),
    });

  const openOptions = () => {
    void browser.runtime.openOptionsPage();
    window.close();
  };

  const renderProfile = (index: number, grouped = false) => (
    <ProfileItem
      key={index}
      id={`profile-${index}`}
      profile={config.profiles[index]!}
      grouped={grouped}
      onToggle={(enabled) => toggle(index, enabled)}
      onHeaderValue={(list, h, value) => setHeaderValue(index, list, h, value)}
    />
  );

  return (
    <div className="flex w-[360px] flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <img src={icon} alt="" className="size-5" />
        <h1 className="font-heading text-base font-semibold">Headering</h1>
        {activeCount > 0 && <Badge>{activeCount} active</Badge>}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={openOptions} aria-label="Settings">
              <Settings />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Manage configuration</TooltipContent>
        </Tooltip>
      </header>

      {config.inspect && <DocumentHeaders inspect={config.inspect} />}

      {config.profiles.length ? (
        <ItemGroup className="gap-2 p-3">
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
                <div className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted-foreground">
                  <Link2 className="size-3.5" />
                  <span className="font-medium text-foreground">{entry.name}</span>
                  <span>· one at a time</span>
                </div>
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
            <Button onClick={openOptions}>Import configuration</Button>
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
  onToggle,
  onHeaderValue,
}: {
  id: string;
  profile: Profile;
  grouped: boolean;
  onToggle: (enabled: boolean) => void;
  onHeaderValue: (list: HeaderList, headerIndex: number, value: string) => void;
}) {
  return (
    <Item
      variant={grouped ? 'default' : 'outline'}
      size="sm"
      className={cn(
        grouped && 'px-2',
        profile.enabled && (grouped ? 'bg-muted' : 'border-primary/40 bg-muted/50'),
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
        <Switch id={id} checked={profile.enabled} onCheckedChange={onToggle} />
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

export default App;
