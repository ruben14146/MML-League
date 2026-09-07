import BansManager from "@/components/admin/BansManager";

export default function AdminBansPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Bans</h1>
      <p className="mt-1 text-sm text-muted">
        Ban a Discord ID before they ever sign in, or ban someone who already has — either way
        they're blocked from signing in and from submitting tickets.
      </p>
      <div className="mt-6">
        <BansManager />
      </div>
    </div>
  );
}
