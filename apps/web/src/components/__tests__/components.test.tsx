import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "@pricedekho/database";
import { freshnessConfigFromHours, PRICE_STATUS_LABELS } from "@pricedekho/shared";
import { presentProduct } from "@/lib/present";
import { PriceComparisonTable } from "../PriceComparisonTable";
import { PriceHistoryChart } from "../PriceHistoryChart";
import { PriceStatusLabel } from "../PriceStatusLabel";

const now = new Date("2026-10-29T12:00:00Z");

describe("PriceStatusLabel", () => {
  it.each([
    ["demo", "DEMO"],
    ["live", "Live — recently checked"],
    ["stale", "Stale — refresh required"],
    ["unavailable", "Unavailable"],
    ["source_error", "Source error"],
  ] as const)("renders %s with an accessible description", (status, label) => {
    render(<PriceStatusLabel status={status} />);
    const badge = screen.getByTitle(PRICE_STATUS_LABELS[status].description);
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveTextContent(PRICE_STATUS_LABELS[status].description);
  });
});

describe("PriceComparisonTable", () => {
  it("labels demo offers and their links unmistakably", async () => {
    const detail = (await new MemoryCatalogRepository().getProductBySlug("apple-iphone-13-128gb-midnight"))!;
    const presented = presentProduct(detail, now, freshnessConfigFromHours(24));
    render(<PriceComparisonTable offers={presented.offers} lowestOfferId={presented.lowest?.offerId ?? null} now={now} />);

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(within(row).getByText("DEMO")).toBeInTheDocument();
      expect(within(row).getByText("Never verified")).toBeInTheDocument();
      const link = within(row).getByRole("link");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(link).toHaveAccessibleName(expect.stringContaining("fictional demo store"));
    }
    // Lowest price first
    expect(within(rows[0]!).getByText("₹52,111")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("Lowest")).toBeInTheDocument();
  });
});

describe("PriceHistoryChart", () => {
  it("explains missing history instead of drawing a fake chart", () => {
    render(<PriceHistoryChart observations={[]} />);
    expect(screen.getByText("No price history yet")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("plots only recorded observations", () => {
    const observations = [
      { offerId: "o1", storeName: "Store A", pricePaise: 100_000, availability: "in_stock" as const, observedAt: "2026-10-01T00:00:00Z" },
      { offerId: "o1", storeName: "Store A", pricePaise: 95_000, availability: "in_stock" as const, observedAt: "2026-10-10T00:00:00Z" },
    ];
    const { container } = render(<PriceHistoryChart observations={observations} />);
    expect(screen.getByRole("img", { name: "Recorded price history by store" })).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    expect(within(container.querySelector("table")!).getAllByRole("row")).toHaveLength(3);
  });
});
