"use client";

import type { ChildSession, Household } from "@/domain/household";
import { withChoreCollections } from "@/domain/chores";
import { withGoalCollections } from "@/domain/goals";

const HOUSEHOLD_KEY = "familyapp.household.v1";
const CHILD_SESSION_KEY = "familyapp.childSession.v1";

let householdCache: Household | null | undefined;
let childSessionCache: ChildSession | null | undefined;
const householdListeners = new Set<() => void>();
const childSessionListeners = new Set<() => void>();

export function loadHousehold(): Household | null {
  if (householdCache !== undefined) {
    return householdCache;
  }

  const value = window.localStorage.getItem(HOUSEHOLD_KEY);
  if (!value) {
    householdCache = null;
    return null;
  }

  householdCache = withGoalCollections(
    withChoreCollections(JSON.parse(value) as Household),
  );
  return householdCache;
}

export function saveHousehold(household: Household): void {
  householdCache = household;
  window.localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(household));
  emitHouseholdChange();
}

export function clearHousehold(): void {
  householdCache = null;
  childSessionCache = null;
  window.localStorage.removeItem(HOUSEHOLD_KEY);
  window.localStorage.removeItem(CHILD_SESSION_KEY);
  emitHouseholdChange();
  emitChildSessionChange();
}

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

export function getHouseholdSnapshot(): Household | null {
  return loadHousehold();
}

export function getChildSessionSnapshot(): ChildSession | null {
  return loadChildSession();
}

export function getServerSnapshot(): null {
  return null;
}

export function getHydratedSnapshot(): boolean {
  return true;
}

export function getServerHydratedSnapshot(): boolean {
  return false;
}

export function subscribeHousehold(listener: () => void): () => void {
  householdListeners.add(listener);
  return () => householdListeners.delete(listener);
}

export function subscribeChildSession(listener: () => void): () => void {
  childSessionListeners.add(listener);
  return () => childSessionListeners.delete(listener);
}

export function subscribeHydration(): () => void {
  return () => undefined;
}

function emitHouseholdChange(): void {
  householdListeners.forEach((listener) => listener());
}

function emitChildSessionChange(): void {
  childSessionListeners.forEach((listener) => listener());
}
