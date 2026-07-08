import { LoginThemeShell } from "@/components/login/LoginThemeShell";

export default function RedefinirSenhaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LoginThemeShell>{children}</LoginThemeShell>;
}
