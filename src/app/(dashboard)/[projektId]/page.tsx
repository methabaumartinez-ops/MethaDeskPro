import { redirect } from 'next/navigation';

export default async function OverviewPage({ params }: { params: Promise<{ projektId: string }> }) {
    const p = await params;
    // Permanent redirect to Teilsysteme tab
    redirect(`/${p.projektId}/teilsysteme`);
}
