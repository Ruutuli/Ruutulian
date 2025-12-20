export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages (like login) should not have navigation
  return <>{children}</>;
}










