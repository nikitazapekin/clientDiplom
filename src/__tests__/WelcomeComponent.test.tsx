import { render, screen } from "@testing-library/react";

import WelcomeComponent from "@/app/components/WelcomeComponent";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("WelcomeComponent", () => {
  it("renders welcome title", () => {
    render(<WelcomeComponent />);
    expect(screen.getByText("Добро пожаловать!")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<WelcomeComponent />);
    expect(screen.getByText("Куда направимся?")).toBeInTheDocument();
  });

  it("renders all navigation cards", () => {
    render(<WelcomeComponent />);
    expect(screen.getByText("Учиться")).toBeInTheDocument();
    expect(screen.getByText("Проблемы")).toBeInTheDocument();
    expect(screen.getByText("Статьи")).toBeInTheDocument();
    expect(screen.getByText("Профиль")).toBeInTheDocument();
    expect(screen.getByText("Достижения")).toBeInTheDocument();
  });

  it("renders images for all cards", () => {
    render(<WelcomeComponent />);
    const images = screen.getAllByRole("img");

    expect(images).toHaveLength(5);
  });
});
