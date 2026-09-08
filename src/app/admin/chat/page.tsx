import StaffChat from "@/components/admin/StaffChat";

export default function AdminChatPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Staff Chat</h1>
      <p className="mt-1 text-sm text-muted">A shared channel for all staff.</p>
      <div className="mt-6">
        <StaffChat />
      </div>
    </div>
  );
}
