import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Button from "@/app/components/Button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button text="Нажми меня" onClick={jest.fn()} />);
    expect(screen.getByRole("button", { name: /нажми меня/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = jest.fn();

    render(<Button text="Click" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom background color", () => {
    render(<Button text="Color" onClick={jest.fn()} color="#ff0000" />);
    expect(screen.getByRole("button")).toHaveStyle({ backgroundColor: "#ff0000" });
  });

  it("applies custom text color", () => {
    render(<Button text="Text" onClick={jest.fn()} textColor="#ffffff" />);
    expect(screen.getByRole("button")).toHaveStyle({ color: "#ffffff" });
  });

  it("applies maxWidth", () => {
    render(<Button text="Wide" onClick={jest.fn()} width="200px" />);
    expect(screen.getByRole("button")).toHaveStyle({ maxWidth: "200px" });
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button text="Disabled" onClick={jest.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is not disabled when disabled prop is false", () => {
    render(<Button text="Enabled" onClick={jest.fn()} disabled={false} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = jest.fn();

    render(<Button text="NoClick" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
