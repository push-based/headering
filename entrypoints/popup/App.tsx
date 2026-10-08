import { Popup } from '@/components/popup/Popup';
import type { Config } from '@/lib/config';
import { documentRequestItem, type DocumentRequest } from '@/lib/document';
import { configItem, pausedItem } from '@/lib/settings';
import { requestClearSiteData, siteOrigin } from '@/lib/site';

async function inspectedTabId(): Promise<number | undefined> {
  // e2e tests open the popup as a regular tab, so they point it at the page under test.
  const param = Number(new URLSearchParams(location.search).get('tabId'));
  if (param) return param;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

/** The active tab's latest document request; `undefined` while loading, `null` if none was captured. */
function useDocumentRequest() {
  const [tabId, setTabId] = useState<number>();
  const [origin, setOrigin] = useState<string>();
  const [request, setRequest] = useState<DocumentRequest | null>();

  useEffect(() => {
    let unwatch: (() => void) | undefined;
    let cancelled = false;

    void inspectedTabId().then(async (id) => {
      if (id === undefined) return setRequest(null);
      const item = documentRequestItem(id);
      const [value, tab] = await Promise.all([item.getValue(), browser.tabs.get(id).catch(() => undefined)]);
      if (cancelled) return;
      setTabId(id);
      setOrigin(siteOrigin(tab?.url));
      setRequest(value);
      unwatch = item.watch(setRequest);
    });

    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, []);

  return { tabId, origin, request };
}

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [paused, setPaused] = useState(false);
  const { tabId, origin, request } = useDocumentRequest();

  useEffect(() => {
    configItem.getValue().then(setConfig);
    return configItem.watch(setConfig);
  }, []);

  useEffect(() => {
    pausedItem.getValue().then(setPaused);
    return pausedItem.watch(setPaused);
  }, []);

  if (!config) return null;

  const openOptions = () => {
    void browser.runtime.openOptionsPage();
    window.close();
  };

  return (
    <Popup
      config={config}
      paused={paused}
      request={request}
      onConfigChange={(next) => void configItem.setValue(next)}
      onPausedChange={(value) => void pausedItem.setValue(value)}
      onOpenOptions={openOptions}
      siteOrigin={origin}
      onClearSiteData={tabId === undefined ? undefined : (reload) => requestClearSiteData(tabId, reload)}
      onReloadExtension={() => browser.runtime.reload()}
    />
  );
}

export default App;
