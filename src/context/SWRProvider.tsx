'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr';
import { ReactNode } from 'react';

export function SWRProvider({ children }: { children: ReactNode }) {
    return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
