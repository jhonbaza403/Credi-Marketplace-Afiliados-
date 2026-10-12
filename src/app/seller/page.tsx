import { redirect } from "next/navigation";

export default function SellerRedirect() {
  redirect("/dashboard/seller");
}
