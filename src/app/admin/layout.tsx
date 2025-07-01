// This layout applies to the /admin route
// It ensures the global styles and Toaster from the root layout are still available.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
