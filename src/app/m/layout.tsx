import type { Metadata, Viewport } from 'next';
import { MemberAuthProvider } from '@/context/MemberAuthContext';
import { SWRProvider } from '@/context/SWRProvider';
import MemberShell from '@/components/member/MemberShell';
import MemberServiceWorker from '@/components/member/MemberServiceWorker';

export const metadata: Metadata = {
    title: 'ChitWise Member',
    description: 'Track your chit groups, dues, payments and draws.',
    manifest: '/m/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'ChitWise',
    },
    icons: {
        icon: '/icons/member-icon.svg',
        apple: '/icons/member-icon.svg',
    },
};

export const viewport: Viewport = {
    themeColor: '#4f46e5',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
    return (
        <SWRProvider>
            <MemberAuthProvider>
                <MemberServiceWorker />
                <MemberShell>{children}</MemberShell>
            </MemberAuthProvider>
        </SWRProvider>
    );
}
