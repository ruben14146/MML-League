import TicketWizard from "@/components/TicketWizard";

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold">Open a Ticket</h1>
        <p className="mt-2 text-muted">
          Answer a few quick questions to submit your ticket for review.
        </p>
      </div>
      <TicketWizard />
    </div>
  );
}
