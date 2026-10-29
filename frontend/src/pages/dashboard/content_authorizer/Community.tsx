import ContentAuthorizerShell from './ContentAuthorizerShell';
import CommunityForm from '@/pages/dashboard/admin/Community';

export default function ContentAuthorizerCommunity() {
  return (
    <ContentAuthorizerShell
      title="Community"
      subtitle="Create and publish community content"
    >
      <CommunityForm />
    </ContentAuthorizerShell>
  );
}
