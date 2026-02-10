'use client';

import useSWR, { SWRConfiguration, mutate as globalMutate } from 'swr';
import {
    dashboardApi,
    groupsApi,
    membersApi,
    subscriptionsApi,
    collectionsApi,
    winnersApi,
    reportsApi,
    organisationsApi,
    usersApi,
    notificationsApi,
} from './api';

// =============================================================================
// Global SWR Configuration
// =============================================================================
export const swrConfig: SWRConfiguration = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    focusThrottleInterval: 10000,
    errorRetryCount: 3,
    keepPreviousData: true,
};

// =============================================================================
// Cache Key Constants
// =============================================================================
export const CACHE_KEYS = {
    DASHBOARD: '/dashboard',
    GROUPS: '/groups',
    GROUP: (id: string) => `/groups/${id}`,
    MEMBERS: '/members',
    MEMBER: (id: string) => `/members/${id}`,
    SUBSCRIPTIONS: (filters?: { groupId?: string; memberId?: string }) => {
        const base = '/subscriptions';
        if (!filters?.groupId && !filters?.memberId) return base;
        const p: Record<string, string> = {};
        if (filters.groupId) p.groupId = filters.groupId;
        if (filters.memberId) p.memberId = filters.memberId;
        return `${base}?${new URLSearchParams(p).toString()}`;
    },
    COLLECTIONS: (filters?: { groupId?: string; memberId?: string; groupMemberId?: string }) => {
        const base = '/collections';
        if (!filters?.groupId && !filters?.memberId && !filters?.groupMemberId) return base;
        const p: Record<string, string> = {};
        if (filters?.groupId) p.groupId = filters.groupId;
        if (filters?.memberId) p.memberId = filters.memberId;
        if (filters?.groupMemberId) p.groupMemberId = filters.groupMemberId;
        return `${base}?${new URLSearchParams(p).toString()}`;
    },
    WINNERS: (filters?: { groupId?: string }) => {
        const base = '/winners';
        if (!filters?.groupId) return base;
        return `${base}?groupId=${filters.groupId}`;
    },
    REPORTS: '/reports',
    ORGANISATIONS: '/organisations',
    ORGANISATION: (id: string) => `/organisations/${id}`,
    USERS: '/users',
    NOTIFICATIONS: '/notifications',
};

// =============================================================================
// Dashboard Hook
// =============================================================================
export function useDashboard() {
    return useSWR(CACHE_KEYS.DASHBOARD, () => dashboardApi.get(), swrConfig);
}

// =============================================================================
// Groups Hooks
// =============================================================================
export function useGroups(params?: { organisationId?: string }) {
    return useSWR(CACHE_KEYS.GROUPS, () => groupsApi.list(params), swrConfig);
}

export function useGroup(id: string | undefined) {
    return useSWR(id ? CACHE_KEYS.GROUP(id) : null, () => groupsApi.get(id!), swrConfig);
}

// =============================================================================
// Members Hooks
// =============================================================================
export function useMembers() {
    return useSWR(CACHE_KEYS.MEMBERS, () => membersApi.list(), swrConfig);
}

export function useMember(id: string | undefined) {
    return useSWR(id ? CACHE_KEYS.MEMBER(id) : null, () => membersApi.get(id!), swrConfig);
}

// =============================================================================
// Subscriptions Hook
// =============================================================================
export function useSubscriptions(filters?: { groupId?: string; memberId?: string }) {
    return useSWR(
        CACHE_KEYS.SUBSCRIPTIONS(filters),
        () => subscriptionsApi.list(filters),
        swrConfig
    );
}

// =============================================================================
// Collections Hook
// =============================================================================
export function useCollections(filters?: { groupId?: string; memberId?: string; groupMemberId?: string }) {
    return useSWR(
        CACHE_KEYS.COLLECTIONS(filters),
        () => collectionsApi.list(filters),
        swrConfig
    );
}

// =============================================================================
// Winners Hook
// =============================================================================
export function useWinners(filters?: { groupId?: string }) {
    return useSWR(CACHE_KEYS.WINNERS(filters), () => winnersApi.list(filters), swrConfig);
}

// =============================================================================
// Reports Hook
// =============================================================================
export function useReports() {
    return useSWR(CACHE_KEYS.REPORTS, () => reportsApi.get(), swrConfig);
}

// =============================================================================
// Organisations Hook (Admin only)
// =============================================================================
export function useOrganisations() {
    return useSWR(CACHE_KEYS.ORGANISATIONS, () => organisationsApi.list(), swrConfig);
}

export function useOrganisation(id: string | undefined) {
    return useSWR(id ? CACHE_KEYS.ORGANISATION(id) : null, () => organisationsApi.get(id!), swrConfig);
}

// =============================================================================
// Users Hook (Admin only)
// =============================================================================
export function useUsers() {
    return useSWR(CACHE_KEYS.USERS, () => usersApi.list(), swrConfig);
}

// =============================================================================
// Notifications Hook (Admin only)
// =============================================================================
export function useNotifications() {
    return useSWR(CACHE_KEYS.NOTIFICATIONS, () => notificationsApi.list(), swrConfig);
}

// =============================================================================
// Cache Invalidation Helpers
// =============================================================================

export async function invalidateAfterCollectionCreate(groupId?: string) {
    await Promise.all([
        globalMutate(CACHE_KEYS.DASHBOARD),
        globalMutate(CACHE_KEYS.COLLECTIONS()),
        groupId && globalMutate(CACHE_KEYS.GROUP(groupId)),
        groupId && globalMutate(CACHE_KEYS.SUBSCRIPTIONS({ groupId })),
    ]);
}

export async function invalidateAfterMemberCreate() {
    await Promise.all([
        globalMutate(CACHE_KEYS.MEMBERS),
        globalMutate(CACHE_KEYS.DASHBOARD),
    ]);
}

export async function invalidateAfterGroupMutation(groupId?: string) {
    await Promise.all([
        globalMutate(CACHE_KEYS.GROUPS),
        groupId && globalMutate(CACHE_KEYS.GROUP(groupId)),
        globalMutate(CACHE_KEYS.DASHBOARD),
    ]);
}

export async function invalidateAfterWinnerCreate(groupId?: string) {
    await Promise.all([
        globalMutate(CACHE_KEYS.WINNERS()),
        groupId && globalMutate(CACHE_KEYS.WINNERS({ groupId })),
        groupId && globalMutate(CACHE_KEYS.GROUP(groupId)),
        globalMutate(CACHE_KEYS.DASHBOARD),
    ]);
}

export async function invalidateAfterSubscriptionCreate(groupId?: string) {
    await Promise.all([
        globalMutate(CACHE_KEYS.SUBSCRIPTIONS()),
        groupId && globalMutate(CACHE_KEYS.SUBSCRIPTIONS({ groupId })),
        groupId && globalMutate(CACHE_KEYS.GROUP(groupId)),
        globalMutate(CACHE_KEYS.DASHBOARD),
    ]);
}

export async function invalidateAfterOrgMutation() {
    await Promise.all([
        globalMutate(CACHE_KEYS.ORGANISATIONS),
        globalMutate(CACHE_KEYS.DASHBOARD),
    ]);
}

export async function invalidateAfterUserMutation() {
    await globalMutate(CACHE_KEYS.USERS);
}

export async function invalidateAfterNotification() {
    await globalMutate(CACHE_KEYS.NOTIFICATIONS);
}

export async function invalidateAllCaches() {
    await globalMutate(() => true, undefined, { revalidate: false });
}
