import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { HydrationErrorLogger } from "@/components/HydrationErrorLogger";

export default function PortalPedidosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientErrorBoundary area="portal-pedidos">
      <HydrationErrorLogger area="portal-pedidos" />
      {children}
    </ClientErrorBoundary>
  );
}
