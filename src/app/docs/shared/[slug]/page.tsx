import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string }>
}

/** ponytail: shared docs that belong in a game shell redirect to the game route. */
const GAME_SHELL_REDIRECTS: Record<string, string> = {
  glossary: "/games/skull-king/docs/glossary",
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const target = GAME_SHELL_REDIRECTS[slug]
  if (target) redirect(target)
  redirect("/")
}
