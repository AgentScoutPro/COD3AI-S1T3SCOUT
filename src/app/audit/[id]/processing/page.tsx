import { ProcessingView } from "@/components/audit/processing-view";

export default async function AuditProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="flex-1 px-6 py-16">
      <ProcessingView auditId={id} />
    </main>
  );
}
