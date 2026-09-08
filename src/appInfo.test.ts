import { describe, it, expect } from 'vitest';
import { APP_NAME, formatDocumentTitle } from './appInfo';

describe('formatDocumentTitle', () => {
  it('returns the bare app name when no screen title is given', () => {
    expect(formatDocumentTitle()).toBe(APP_NAME);
  });

  it('suffixes the app name for a named screen', () => {
    expect(formatDocumentTitle('Livestock')).toBe('Livestock · Veld');
  });

  it('treats a whitespace-only screen title as no title', () => {
    expect(formatDocumentTitle('   ')).toBe(APP_NAME);
  });

  it('trims surrounding whitespace from a screen title', () => {
    expect(formatDocumentTitle('  Tasks  ')).toBe('Tasks · Veld');
  });
});
