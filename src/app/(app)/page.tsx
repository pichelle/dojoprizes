import { redirect } from "next/navigation";

// The Request log is now the landing page (the old "Queue" board here was
// a redundant, narrower view of the same data -- see RequestsKanban).
export default function HomePage() {
  redirect("/requests");
}
