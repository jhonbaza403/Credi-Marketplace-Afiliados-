import { redirect } from "next/navigation";

/** Legacy seller entry point; the dashboard remains the single canonical destination. */
export default function SellerIndexPage() {
  redirect("/dashboard");
}
