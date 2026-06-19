import { redirect } from "next/navigation"

export default function LegacySetupRedirect() {
  redirect("/games/skull-king/calculator/setup")
}
