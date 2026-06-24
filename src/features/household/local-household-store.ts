"use client";

import type { ChildSession } from "@/domain/household";

const CHILD_SESSION_KEY = "familyapp.childSession.v1";

let childSessionCache: ChildSession | null | undefined;
const childSessionListeners = new Set<() => void>();

export function loadChildSession(): ChildSession | null {
  if (childSessionCache !== undefined) {
    return childSessionCache;
  }

  const value = window.localStorage.getItem(CHILD_SESSION_KEY);
  if (!value) {
    childSessionCache = null;
    return null;
  }

  childSessionCache = JSON.parse(value) as ChildSession;
  return childSessionCache;
}

export function saveChildSession(session: ChildSession): void {
  childSessionCache = session;
  window.localStorage.setItem(CHILD_SESSION_KEY, JSON.stringify(session));
  emitChildSessionChange();
}

export function clearChildSession(): void {
  childSessionCache = null;
  window.localStorage.removeItem(CHILD_SESSION_KEY);
  emitChildSessionChange();
}

export function getChildSessionSnapshot(): ChildSession | null {
  return loadChildSession();
}

export function getServerSnapshot(): null {
  return null;
}

export function subscribeChildSession(listener: () => void): () => void {
  childSessionListeners.add(listener);
  return () => childSessionListeners.delete(listener);
}

function emitChildSessionChange(): void {
  childSessionListeners.forEach((listener) => listener());
}
