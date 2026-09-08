import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_ROUTE, ROUTE_IDS, type RouteId } from './navigation';

/**
 * Minimal hash-based router. Hash routing needs no server rewrite rules, so it
 * works on any static host and offline once the shell is cached — which is why
 * it is preferred over the History API for this PWA. A dependency would be more
 * than five fixed destinations warrant.
 */

/** Reads the route id out of a location hash, falling back to the default. */
export function parseHash(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '').split('/')[0];
  return (ROUTE_IDS as readonly string[]).includes(id) ? (id as RouteId) : DEFAULT_ROUTE;
}

/** The canonical hash for a route id. */
export function routeToHash(id: RouteId): string {
  return `#/${id}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getSnapshot(): string {
  return window.location.hash;
}

function getServerSnapshot(): string {
  return '';
}

export type Navigate = (id: RouteId) => void;

export function useHashRoute(): [RouteId, Navigate] {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const route = parseHash(hash);
  const navigate = useCallback<Navigate>((id) => {
    window.location.hash = routeToHash(id);
  }, []);
  return [route, navigate];
}
