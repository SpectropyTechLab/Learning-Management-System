import SuperAdminShell from './components/SuperAdminShell';
import ModuleEntitlementsManager from '@/features/module-entitlements/components/ModuleEntitlementsManager';

export default function ExamEntitlementsPage() {
  return (
    <SuperAdminShell
      title="Exam Entitlements"
      subtitle="Manage separate Exams feature access and entitled programs per client."
    >
      <ModuleEntitlementsManager
        modulePath="exam-entitlements"
        featureKey="exams"
        featureLabel="Exams"
        featureDescription="Enable or disable Exams access for the selected client."
        programSectionTitle="Exam Program Entitlements"
        emptyProgramText="No programs found for this client."
      />
    </SuperAdminShell>
  );
}
