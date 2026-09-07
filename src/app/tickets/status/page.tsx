import StatusChecker from "@/components/StatusChecker";

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 text-center">
      <h1 className="text-3xl font-extrabold">Check Ticket Status</h1>
      <p className="mt-2 text-muted">Enter your ticket ID to see where it stands.</p>
      <StatusChecker />
    </div>
  );
}
