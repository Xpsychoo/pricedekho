import type { OfferAvailability } from "@pricedekho/shared";

export interface Observation {
  pricePaise: number;
  availability: OfferAvailability;
  observedAt: string;
}

/** Default: record an unchanged price at most once every 24 hours. */
export const DEFAULT_OBSERVATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Decides whether a successful refresh should append a price_history row.
 * Records when there is no previous observation, when the price or
 * availability changed, or when the last observation is older than the
 * interval. Never records an observation dated before the previous one.
 */
export function shouldRecordObservation(
  previous: Observation | null,
  next: Observation,
  intervalMs: number = DEFAULT_OBSERVATION_INTERVAL_MS,
): boolean {
  if (!previous) return true;
  const prevTime = new Date(previous.observedAt).getTime();
  const nextTime = new Date(next.observedAt).getTime();
  if (!Number.isFinite(nextTime) || nextTime <= prevTime) return false;
  if (previous.pricePaise !== next.pricePaise) return true;
  if (previous.availability !== next.availability) return true;
  return nextTime - prevTime >= intervalMs;
}
