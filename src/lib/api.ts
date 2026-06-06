'use client';

// =============================================================================
// Centralized API Client for ChitWise Admin
// Uses cookie-based auth (credentials: 'include') — no localStorage tokens
// =============================================================================

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        credentials: 'include',
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Something went wrong' }));
        throw new Error(error.error || error.message || 'API Error');
    }

    return response.json();
}

// =============================================================================
// Auth APIs
// =============================================================================
export const authApi = {
    login: (email: string, password: string) =>
        api<{ user: any }>('/api/auth/login', { method: 'POST', body: { email, password } }),
    logout: () => api('/api/auth/logout', { method: 'POST' }),
    me: () => api<any>('/api/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
        api<{ message: string }>('/api/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword },
        }),
};

// =============================================================================
// App Settings API (Super Admin only)
// =============================================================================
export const settingsApi = {
    get: () => api<any>('/api/settings'),
    update: (data: any) => api<any>('/api/settings', { method: 'PUT', body: data }),
};

// =============================================================================
// Dashboard API
// =============================================================================
export const dashboardApi = {
    get: () =>
        api<{
            stats: {
                activeGroups: number;
                totalCollections: number;
                activeMembers: number;
                pendingDues: number;
            };
            recentCollections: any[];
            pendingDuesList: any[];
        }>('/api/dashboard'),
};

// =============================================================================
// Groups (ChitGroups) APIs
// =============================================================================
export const groupsApi = {
    list: (params?: { organisationId?: string }) => {
        const query = params?.organisationId ? `?organisationId=${params.organisationId}` : '';
        return api<any[]>(`/api/chitgroups${query}`);
    },
    get: (id: string) => api<any>(`/api/chitgroups/${id}`),
    create: (data: any) => api<any>('/api/chitgroups', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/chitgroups/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/chitgroups/${id}`, { method: 'DELETE' }),
    clone: (id: string) => api<any>(`/api/chitgroups/${id}/clone`, { method: 'POST' }),
};

// =============================================================================
// Members APIs
// =============================================================================
export const membersApi = {
    list: () => api<any[]>('/api/members'),
    get: (id: string) => api<any>(`/api/members/${id}`),
    create: (data: any) => api<any>('/api/members', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/members/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/members/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Group Members (Subscriptions) APIs
// =============================================================================
export const subscriptionsApi = {
    list: (filters?: { groupId?: string; memberId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.groupId) params.set('groupId', filters.groupId);
        if (filters?.memberId) params.set('memberId', filters.memberId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return api<any[]>(`/api/groupmembers${query}`);
    },
    get: (id: string) => api<any>(`/api/groupmembers/${id}`),
    create: (data: any) => api<any>('/api/groupmembers', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/groupmembers/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/groupmembers/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Collections APIs
// =============================================================================
export const collectionsApi = {
    list: (filters?: { groupId?: string; memberId?: string; groupMemberId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.groupId) params.set('groupId', filters.groupId);
        if (filters?.memberId) params.set('memberId', filters.memberId);
        if (filters?.groupMemberId) params.set('groupMemberId', filters.groupMemberId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return api<any[]>(`/api/collections${query}`);
    },
    get: (id: string) => api<any>(`/api/collections/${id}`),
    create: (data: any) => api<any>('/api/collections', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/collections/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/collections/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Winners APIs
// =============================================================================
export const winnersApi = {
    list: (filters?: { groupId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.groupId) params.set('groupId', filters.groupId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return api<any[]>(`/api/winners${query}`);
    },
    get: (id: string) => api<any>(`/api/winners/${id}`),
    create: (data: any) => api<any>('/api/winners', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/winners/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/winners/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Reports API
// =============================================================================
export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    groupId?: string;
    paymentMode?: string;
}

function reportQuery(filters?: ReportFilters): string {
    if (!filters) return '';
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.groupId) params.set('groupId', filters.groupId);
    if (filters.paymentMode) params.set('paymentMode', filters.paymentMode);
    const q = params.toString();
    return q ? `?${q}` : '';
}

export const reportsApi = {
    get: (filters?: ReportFilters) =>
        api<{
            filters: ReportFilters;
            trends: any[];
            distribution: any[];
            paymentModeStats: any[];
            recentTransactions: any[];
            groupPerformance: any[];
            defaulters: any[];
            groups: { _id: string; groupName: string }[];
            summary: {
                totalCollected: number;
                totalOutstanding: number;
                activeMembers: number;
                activeGroups: number;
                defaulterCount: number;
            };
        }>(`/api/reports${reportQuery(filters)}`),
    exportUrl: (format: 'csv' | 'excel' | 'pdf', filters?: ReportFilters) => {
        const params = new URLSearchParams();
        params.set('format', format);
        if (filters?.startDate) params.set('startDate', filters.startDate);
        if (filters?.endDate) params.set('endDate', filters.endDate);
        if (filters?.groupId) params.set('groupId', filters.groupId);
        if (filters?.paymentMode) params.set('paymentMode', filters.paymentMode);
        return `/api/reports/export?${params.toString()}`;
    },
};

// =============================================================================
// Organisations APIs (Admin only)
// =============================================================================
export const organisationsApi = {
    list: () => api<any[]>('/api/organisations'),
    get: (id: string) => api<any>(`/api/organisations/${id}`),
    create: (data: any) => api<any>('/api/organisations', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/organisations/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/organisations/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Users APIs (Admin only)
// =============================================================================
export const usersApi = {
    list: () => api<any[]>('/api/users'),
    get: (id: string) => api<any>(`/api/users/${id}`),
    create: (data: any) => api<any>('/api/users', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/api/users/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => api<any>(`/api/users/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Notifications APIs (Admin only)
// =============================================================================
export const notificationsApi = {
    list: () => api<{ notifications: any[] }>('/api/notifications'),
    create: (data: any) => api<any>('/api/notifications', { method: 'POST', body: data }),
    delete: (id: string) => api<any>(`/api/notifications/${id}`, { method: 'DELETE' }),
    resend: (id: string) => api<any>(`/api/notifications/${id}?action=resend`, { method: 'POST' }),
    templates: {
        list: () => api<any[]>('/api/notifications/templates'),
        create: (data: any) => api<any>('/api/notifications/templates', { method: 'POST', body: data }),
        delete: (id: string) => api<any>(`/api/notifications/templates/${id}`, { method: 'DELETE' }),
    },
};

export default api;
