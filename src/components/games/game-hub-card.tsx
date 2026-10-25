import { ArrowRight, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type GameHubCardProps = {
  href: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  badge?: string;
  playerCount?: string;
  className?: string;
};

export function GameHubCard({
  href,
  title,
  description,
  imageSrc,
  imageAlt,
  badge = "Featured Title",
  playerCount = "2–8 Players",
  className,
}: GameHubCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block outline-none transition-transform active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <Card className="h-full gap-0 overflow-hidden py-0 border-border/80 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:bg-card hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b border-border bg-muted/60">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/90 px-2.5 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase text-primary backdrop-blur-md">
            <span>{badge}</span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-border/70 bg-background/85 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <Users className="size-3 text-primary" />
            <span>{playerCount}</span>
          </div>
        </div>
        <CardHeader className="gap-2.5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-bold text-foreground transition-colors group-hover:text-primary">
              {title}
            </CardTitle>
            <span className="flex size-7 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-5">
          <div className="flex flex-wrap gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
            <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5">
              Live play
            </span>
            <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5">
              Score calculator
            </span>
            <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5">
              Rulebook
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
