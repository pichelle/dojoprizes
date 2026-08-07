import { redirect } from "next/navigation";

// Editing a filament color now happens inline via the side peek on the
// main filament page instead of a dedicated route -- redirect here in
// case anything still links to the old URL.
export default function EditFilamentRedirectPage() {
  redirect("/filament");
}
