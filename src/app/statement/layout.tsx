// This layout applies to the /statement route
// It ensures the global styles and Toaster from the root layout are still available.

export default function StatementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
