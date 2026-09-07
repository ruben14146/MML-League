import FulfillmentView from "@/components/admin/FulfillmentView";

export default function AdminFulfillmentPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Fulfillment</h1>
      <p className="mt-1 text-sm text-muted">
        Accepted tickets grouped by item, with everyone's VRFS Player ID ready to copy.
      </p>
      <div className="mt-6">
        <FulfillmentView />
      </div>
    </div>
  );
}
