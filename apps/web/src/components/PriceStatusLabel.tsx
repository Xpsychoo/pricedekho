import { BadgeCheck, CircleAlert, Clock, FlaskConical, PackageSearch } from "lucide-react";
import { PRICE_STATUS_LABELS, type PriceStatus } from "@pricedekho/shared";
import { Badge } from "@/components/ui/badge";

const config = {
  demo: { tone: "demo", Icon: FlaskConical },
  live: { tone: "success", Icon: BadgeCheck },
  stale: { tone: "warning", Icon: Clock },
  unavailable: { tone: "neutral", Icon: PackageSearch },
  source_error: { tone: "danger", Icon: CircleAlert },
} as const;

/** Shows where a price came from and how fresh it is. Every price on the site carries one. */
export function PriceStatusLabel({ status, className }: { status: PriceStatus; className?: string }) {
  const { tone, Icon } = config[status];
  const { label, description } = PRICE_STATUS_LABELS[status];
  return (
    <Badge tone={tone} className={className} title={description}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
      <span className="sr-only">: {description}</span>
    </Badge>
  );
}
