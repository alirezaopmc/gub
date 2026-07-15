import { DocsLinkProvider } from "@/components/docs/docs-link-context"
import { DocsProse } from "@/components/docs/docs-prose"
import { renderDoc } from "@/lib/docs/render-doc"

type DocsMdxContentProps = {
  relativePath: string
}

export async function DocsMdxContent({ relativePath }: DocsMdxContentProps) {
  const { Content, components } = await renderDoc(relativePath)

  return (
    <DocsLinkProvider fromPath={relativePath}>
      <DocsProse>
        <Content components={components} />
      </DocsProse>
    </DocsLinkProvider>
  )
}
