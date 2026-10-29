import SuperAdminShell from './components/SuperAdminShell';
import ModuleEntitlementsManager from '@/features/module-entitlements/components/ModuleEntitlementsManager';

export default function QuestionBankEntitlementsPage() {
  return (
    <SuperAdminShell
      title="Question Bank Entitlements"
      subtitle="Manage separate Question Bank feature access and entitled programs per client."
    >
      <ModuleEntitlementsManager
        modulePath="question-bank-entitlements"
        featureKey="question_bank"
        featureLabel="Question Bank"
        featureDescription="Enable or disable Question Bank access for the selected client."
        programSectionTitle="Question Bank Program Entitlements"
        emptyProgramText="No programs found for this client."
      />
    </SuperAdminShell>
  );
}
