import { render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";

describe("Footer", () => {
  it("renders copyright text", () => {
    render(<Footer />);
    expect(screen.getByText(/все права защищены/i)).toBeInTheDocument();
  });

  it("renders AlgoLab name", () => {
    render(<Footer />);
    expect(screen.getByText(/algolab/i)).toBeInTheDocument();
  });

  it("renders current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });

  it("renders copyright symbol", () => {
    render(<Footer />);
    expect(screen.getByText(/©/)).toBeInTheDocument();
  });
});
