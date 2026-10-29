import ProfilePanel from "@/features/users/components/ProfilePanel";
import ContentAuthorizerShell from "./ContentAuthorizerShell";

export default function ContentAuthorizerProfile() {
  return (
    <ContentAuthorizerShell
      title="Profile"
      subtitle="View and update your account details."
    >
      <ProfilePanel />
    </ContentAuthorizerShell>
  );
}
