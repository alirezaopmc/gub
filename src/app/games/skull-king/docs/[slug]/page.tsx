import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  SkullKingDocPage,
  skullKingDocMetadata,
} from "@/components/games/skull-king/docs/skull-king-doc-page"
import { listGameDocSlugs } from "@/lib/docs/build-game-doc-nav"
import { DocNotFoundError } from "@/lib/docs/errors"
import { loadDoc } from "@/lib/docs/load-doc"
import { skullKingDocPath } from "@/lib/docs/skull-king-doc-path"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return listGameDocSlugs("skull-king", "app").map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return skullKingDocMetadata(skullKingDocPath("app", slug))
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const relativePath = skullKingDocPath("app", slug)

  try {
    loadDoc(relativePath)
  } catch (e) {
    if (e instanceof DocNotFoundError) notFound()
    throw e
  }

  return <SkullKingDocPage relativePath={relativePath} />
}
