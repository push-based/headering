import { describe, expect, it } from 'vitest';
import { cookieSite, siteOrigin } from './site';

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

describe('cookieSite', () => {
  it('drops subdomains down to the registrable domain', () => {
    expect(cookieSite('www.bwin.com')).toBe('bwin.com');
    expect(cookieSite('a.b.example.de')).toBe('example.de');
    expect(cookieSite('example.com')).toBe('example.com');
  });

  it('keeps the second level of country codes like co.uk', () => {
    expect(cookieSite('www.example.co.uk')).toBe('example.co.uk');
    expect(cookieSite('shop.example.com.au')).toBe('example.com.au');
  });

  it('leaves single-label hosts and IP addresses alone', () => {
    expect(cookieSite('localhost')).toBe('localhost');
    expect(cookieSite('127.0.0.1')).toBe('127.0.0.1');
  });
});
