import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocsMdxContent } from "@/components/docs/docs-mdx-content"
import { DocNotFoundError } from "@/lib/docs/errors"
import { listSharedDocSlugs } from "@/lib/docs/list-shared-doc-slugs"
import { loadDoc } from "@/lib/docs/load-doc"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return listSharedDocSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const relativePath = `shared/${slug}.md`

  try {
    const { frontmatter } = loadDoc(relativePath)
    return {
      title: `${frontmatter.title} · GUB`,
      description: frontmatter.description,
    }
  } catch {
    return { title: "GUB docs" }
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const relativePath = `shared/${slug}.md`

  try {
    loadDoc(relativePath)
  } catch (e) {
    if (e instanceof DocNotFoundError) notFound()
    throw e
  }

  return (
    <div className="mx-auto w-full max-w-prose px-4 py-8 lg:px-6">
      <DocsMdxContent relativePath={relativePath} />
    </div>
  )
}
