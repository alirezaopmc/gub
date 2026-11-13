import styles from "@/components/docs/styles/card-ref.module.css";
import { CardImage } from "@/components/games/skull-king/shared/card-image";
import { defaultCardRefLabel, resolveCardRefId } from "@/lib/docs/card-ref-ids";
import { cardLabel } from "@/lib/games/skull-king/engine/cards";

const DOC_CARD_WIDTH = 80;
const DOC_CARD_HEIGHT = 112;

export type CardRefProps = {
  id: string;
  label?: string;
};

export function CardRef({ id, label }: CardRefProps) {
  const card = resolveCardRefId(id);
  const displayLabel = label ?? defaultCardRefLabel(id);
  // The visible label already names the card: keep the image silent to avoid a duplicate announcement.
  const decorative = displayLabel === cardLabel(card);

  return (
    <span className={styles.cardRef}>
      <span className={styles.frame}>
        <CardImage
          card={card}
          decorative={decorative}
          className={styles.image}
          width={DOC_CARD_WIDTH}
          height={DOC_CARD_HEIGHT}
        />
      </span>
      <span className={styles.label}>{displayLabel}</span>
    </span>
  );
}
