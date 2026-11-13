import type { Metadata } from "next";
import { TableDisplayViewer } from "@/components/games/skull-king/viewer/table-display";

type PageProps = { params: Promise<{ code: string }> };

export const metadata: Metadata = {
  title: "Table Display · Skull King · GUB",
  description: "Live table display viewer for Skull King.",
};

export default async function TableViewerPage({ params }: PageProps) {
  const { code } = await params;
  return <TableDisplayViewer code={code.toUpperCase()} />;
}
