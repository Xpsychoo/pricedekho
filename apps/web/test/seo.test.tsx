import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButtons } from "@/components/ShareButtons";
import { absoluteUrl, breadcrumbJsonLd, getSocialProfiles, getTwitterHandle, websiteJsonLd } from "@/lib/seo";

afterEach(() => vi.unstubAllEnvs());

describe("SEO helpers", () => {
  it("builds absolute URLs from the configured site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pricedekho.example/");
    expect(absoluteUrl("/product/x")).toBe("https://pricedekho.example/product/x");
    expect(absoluteUrl()).toBe("https://pricedekho.example/");
  });

  it("normalises the Twitter handle", () => {
    vi.stubEnv("NEXT_PUBLIC_TWITTER_HANDLE", "pricedekho");
    expect(getTwitterHandle()).toBe("@pricedekho");
    vi.stubEnv("NEXT_PUBLIC_TWITTER_HANDLE", "");
    expect(getTwitterHandle()).toBeUndefined();
  });

  it("keeps only https social profile URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SOCIAL_PROFILES", "https://x.com/pd, javascript:alert(1), http://insecure.example, not a url ,https://instagram.com/pd");
    expect(getSocialProfiles()).toEqual(["https://x.com/pd", "https://instagram.com/pd"]);
  });

  it("describes the site search for rich results", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pricedekho.example");
    expect(websiteJsonLd().potentialAction.target.urlTemplate).toBe("https://pricedekho.example/search?q={search_term_string}");
  });

  it("numbers breadcrumb items from 1 with absolute URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pricedekho.example");
    const crumbs = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Mobiles", path: "/categories/mobiles" },
    ]);
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://pricedekho.example/" },
      { "@type": "ListItem", position: 2, name: "Mobiles", item: "https://pricedekho.example/categories/mobiles" },
    ]);
  });
});

describe("ShareButtons", () => {
  it("links to share intents with the encoded URL and opens them safely", () => {
    render(<ShareButtons url="https://pricedekho.example/product/a b" title="Phone & case" />);
    const whatsapp = screen.getByRole("link", { name: "Share on WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/?text=Phone%20%26%20case%20https%3A%2F%2Fpricedekho.example%2Fproduct%2Fa%20b");
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });
});
