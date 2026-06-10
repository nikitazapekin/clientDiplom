import { fireEvent,render, screen } from "@testing-library/react";

import Button from "@/app/components/Button";

describe("Button extra", () => {
  it("renders without optional props", () => {
    render(<Button text="Minimal" onClick={jest.fn()} />);
    const btn = screen.getByRole("button");

    expect(btn).toBeInTheDocument();
    expect(btn.style.backgroundColor).toBe("");
    expect(btn.style.maxWidth).toBe("");
    expect(btn.style.color).toBe("");
  });

  it("does not have a type attribute by default", () => {
    render(<Button text="Test" onClick={jest.fn()} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("type");
  });

  it("does not call onClick when disabled and clicked with fireEvent", () => {
    const onClick = jest.fn();

    render(<Button text="No" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders long text without truncation", () => {
    const longText = "A".repeat(100);

    render(<Button text={longText} onClick={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent(longText);
  });

  it("applies all style props simultaneously", () => {
    render(
      <Button
        text="Styled"
        onClick={jest.fn()}
        color="#ff0000"
        width="300px"
        textColor="#0000ff"
      />
    );
    const btn = screen.getByRole("button");

    expect(btn).toHaveStyle({
      backgroundColor: "#ff0000",
      maxWidth: "300px",
      color: "#0000ff",
    });
  });

  it("renders empty string text", () => {
    render(<Button text="" onClick={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("");
  });
});
