import AppShell from "@/components/AppShell";
import { ProfileProvider } from "@/components/ProfileContext";
import { fetchProfiles } from "@/lib/profileActions";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profiles = await fetchProfiles();

  return (
    <ProfileProvider initialProfiles={profiles}>
      <AppShell>{children}</AppShell>
    </ProfileProvider>
  );
}
