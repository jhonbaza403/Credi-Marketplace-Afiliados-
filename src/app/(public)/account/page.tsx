import AccountCenter from "@/features/account/components/AccountCenter";

export const metadata = {
  title: "Mi cuenta | Credi Marketplace",
  description: "Gestiona tu cuenta, privacidad, productos y publicaciones.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountCenter />;
}
