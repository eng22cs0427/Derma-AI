import { redirect } from "next/navigation"

export default function AdminDashboardPage() {
  // Currently the only admin feature is doctor management,
  // so we redirect the root /admin page to /admin/doctors
  redirect("/admin/doctors")
}
