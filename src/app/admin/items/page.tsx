import ItemsManager from "@/components/admin/ItemsManager";

export default function AdminItemsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Items</h1>
      <p className="mt-1 text-sm text-muted">
        Manage the items users pick from when opening a ticket, and the items shown on the public Our Items page.
      </p>
      <div className="mt-6">
        <ItemsManager />
      </div>
    </div>
  );
}
