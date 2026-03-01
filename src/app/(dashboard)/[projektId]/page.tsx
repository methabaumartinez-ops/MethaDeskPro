import { redirect } from 'next/navigation';

export default function OverviewPage({ params }: { params: { projektId: string } }) {
    // Permanent redirect to Teilsysteme tab
    redirect(`/${params.projektId}/teilsysteme`);
}
