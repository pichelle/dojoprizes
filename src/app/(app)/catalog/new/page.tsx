import { redirect } from "next/navigation";

// Adding a prize now happens inline via the side peek on the main catalog
// page instead of a dedicated route -- redirect here in case anything
// still links to the old URL.
export default function NewPrizePage() {
  redirect("/catalog");
}
