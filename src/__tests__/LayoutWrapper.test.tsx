import { render, screen } from "@testing-library/react";

import LayoutWrapper from "@/app/components/LayoutWrapper";

const mockPush = jest.fn();
let mockPathname = "/homepage";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

const setPathname = (path: string) => {
  mockPathname = path;
};

describe("LayoutWrapper", () => {
  beforeEach(() => {
    mockPush.mockReset();
    setPathname("/homepage");
  });

  it("renders children", () => {
    render(<LayoutWrapper><div data-testid="child">Content</div></LayoutWrapper>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows Header and Footer on non-auth pages", () => {
    render(<LayoutWrapper><div>Page</div></LayoutWrapper>);
    expect(screen.getAllByText("Выход").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/все права защищены/i)).toBeInTheDocument();
  });

  it("hides Header and Footer on login page", () => {
    setPathname("/login");
    render(<LayoutWrapper><div>Login</div></LayoutWrapper>);
    expect(screen.queryByText("Выход")).not.toBeInTheDocument();
    expect(screen.queryByText(/все права защищены/i)).not.toBeInTheDocument();
  });

  it("hides Header and Footer on register page", () => {
    setPathname("/register");
    render(<LayoutWrapper><div>Register</div></LayoutWrapper>);
    expect(screen.queryByText("Выход")).not.toBeInTheDocument();
    expect(screen.queryByText(/все права защищены/i)).not.toBeInTheDocument();
  });

  it("still renders children on auth pages", () => {
    setPathname("/login");
    render(<LayoutWrapper><div data-testid="auth-child">Auth Content</div></LayoutWrapper>);
    expect(screen.getByTestId("auth-child")).toBeInTheDocument();
  });
});
