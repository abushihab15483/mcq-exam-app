// আগে contact form সাবমিট হলেও কোথাও সেভ হতো না, কেউ দেখতে পেত না। এখন সেই
// মেসেজগুলো এখানে দেখা যাবে (দেখো supabase/step17-contact-messages.sql,
// app/api/contact/route.ts, components/coaching/ContactForm.tsx)।
import AdminShell from "@/components/admin/AdminShell";
import MessageCell from "@/components/admin/MessageCell";
import Table from "@/components/ui/Table";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ContactMessageRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  subject: string | null;
  message: string;
  created_at: string;
}

export default async function MessagesPage() {
  const supabase = createAdminClient();
  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("id, full_name, phone, email, subject, message, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ContactMessageRow[]>();

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">মেসেজ</h1>
        <p className="mt-1 text-sm text-ink-soft">ওয়েবসাইটের যোগাযোগ ফর্ম থেকে আসা মেসেজ</p>
      </div>

      {error ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-danger">
          <p className="font-medium">তথ্য লোড করতে সমস্যা হয়েছে</p>
          <p className="mt-1 text-sm">{error.message}</p>
          <p className="mt-2 text-sm text-ink-soft">
            এই টেবিল এখনো তৈরি না হয়ে থাকলে supabase/step17-contact-messages.sql
            Supabase Dashboard এর SQL Editor এ Run করো।
          </p>
        </div>
      ) : (
        <Table
          rowKey={(m: ContactMessageRow) => m.id}
          emptyMessage="এখনো কোনো মেসেজ আসেনি"
          columns={[
            { header: "সময়", accessor: (m: ContactMessageRow) => formatDateTime(m.created_at) },
            { header: "নাম", accessor: (m: ContactMessageRow) => m.full_name },
            {
              header: "যোগাযোগ",
              accessor: (m: ContactMessageRow) => (
                <div className="flex flex-col">
                  <span>{m.phone}</span>
                  {m.email && <span className="text-xs text-ink-soft">{m.email}</span>}
                </div>
              ),
            },
            { header: "বিষয়", accessor: (m: ContactMessageRow) => m.subject || "—" },
            {
              header: "মেসেজ",
              accessor: (m: ContactMessageRow) => (
                <MessageCell message={m.message} fullName={m.full_name} subject={m.subject} />
              ),
            },
          ]}
          data={messages ?? []}
        />
      )}
    </AdminShell>
  );
}
