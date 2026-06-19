import { redirect } from "next/navigation"

export default function LegacyStartRedirect() {
  redirect("/games/skull-king/calculator/setup?step=4")
}
