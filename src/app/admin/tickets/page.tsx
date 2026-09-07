import TicketsTable from "@/components/admin/TicketsTable";

export default function AdminTicketsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Tickets</h1>
      <p className="mt-1 text-sm text-muted">Review and update ticket submissions.</p>
      <div className="mt-6">
        <TicketsTable />
      </div>
    </div>
  );
}
