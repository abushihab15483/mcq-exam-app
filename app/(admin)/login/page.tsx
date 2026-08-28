import AdminLoginForm from "@/components/admin/AdminLoginForm";
import Card from "@/components/ui/Card";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6 text-center">অ্যাডমিন লগইন</h1>
      <Card>
        <AdminLoginForm />
      </Card>
    </main>
  );
}
