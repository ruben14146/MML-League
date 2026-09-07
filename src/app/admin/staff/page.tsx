import StaffManager from "@/components/admin/StaffManager";

export default function AdminStaffPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Staff</h1>
      <p className="mt-1 text-sm text-muted">
        Manage who has access to the staff and admin panel.
      </p>
      <div className="mt-6">
        <StaffManager />
      </div>
    </div>
  );
}
