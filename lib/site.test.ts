import { describe, expect, it } from 'vitest';
import { siteOrigin } from './site';

describe('siteOrigin', () => {
  it('keeps the scheme, host and port of web pages', () => {
    expect(siteOrigin('https://app.example.com/path?q=1#top')).toBe('https://app.example.com');
    expect(siteOrigin('http://127.0.0.1:8080/')).toBe('http://127.0.0.1:8080');
  });

  it('has nothing for browser and extension pages or a missing URL', () => {
    expect(siteOrigin('chrome://extensions/')).toBeUndefined();
    expect(siteOrigin('chrome-extension://abc/popup.html')).toBeUndefined();
    expect(siteOrigin('about:blank')).toBeUndefined();
    expect(siteOrigin('not a url')).toBeUndefined();
    expect(siteOrigin(undefined)).toBeUndefined();
  });
});
