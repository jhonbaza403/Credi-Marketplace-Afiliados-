import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata = {
  title: "Iniciar sesión",
  description: "Accede de forma segura a tu cuenta de Credi Marketplace."
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-marketplace-background px-4 py-16 sm:px-6 lg:px-8">
      <LoginForm />
    </main>
  );
}
