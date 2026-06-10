import { render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";

describe("Footer extra", () => {
  it("renders the exact year dynamically", () => {
    const mockDate = new Date("2026-06-15");

    jest.useFakeTimers().setSystemTime(mockDate);
    render(<Footer />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("renders year as 4 digits", () => {
    render(<Footer />);
    const yearText = screen.getByText(/©/).textContent || "";
    const yearMatch = yearText.match(/\d{4}/);

    expect(yearMatch).toBeTruthy();
  });

  it("renders with stable structure", () => {
    const { container } = render(<Footer />);

    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("does not render empty containers", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector("footer")!;

    expect(footer.textContent).not.toBe("");
  });
});
