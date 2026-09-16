import ItemsGrid from "@/components/ItemsGrid";

export default function ItemsPage() {
  return (
    <div className="pb-14">
      <div className="mx-auto max-w-6xl px-5 pt-14 text-center">
        <h1 className="text-3xl font-extrabold">Our Items</h1>
        <p className="mt-2 text-muted">Items available across the league.</p>
      </div>
      <ItemsGrid />
    </div>
  );
}
