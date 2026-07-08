import { LoginThemeShell } from "@/components/login/LoginThemeShell";

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LoginThemeShell>{children}</LoginThemeShell>;
}
