import Image from "next/image"
import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type GameHubCardProps = {
  href: string
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  className?: string
}

export function GameHubCard({
  href,
  title,
  description,
  imageSrc,
  imageAlt,
  className,
}: GameHubCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <Card className="h-full gap-0 overflow-hidden py-0 transition-colors hover:border-foreground/30 hover:bg-muted/20">
        <div className="relative aspect-video w-full shrink-0 border-b border-border bg-muted">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
        <CardHeader className="gap-2 pt-5 pb-6">
          <CardTitle className="text-primary transition-colors group-hover:text-primary/90">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
