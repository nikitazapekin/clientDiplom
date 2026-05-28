import { render, screen, fireEvent } from "@testing-library/react";

import WelcomeCard from "@/app/components/WelcomeCard";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const createItem = (overrides = {}) => ({
  id: 1,
  title: "Учиться",
  type: "study",
  image: { src: "/test.png", width: 100, height: 100 } as unknown as import("next/image").StaticImageData,
  path: "/study",
  ...overrides,
});

describe("WelcomeCard extra", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders with different titles", () => {
    const { rerender } = render(<WelcomeCard item={createItem({ title: "Курсы" })} />);
    expect(screen.getByText("Курсы")).toBeInTheDocument();

    rerender(<WelcomeCard item={createItem({ title: "Задачи" })} />);
    expect(screen.getByText("Задачи")).toBeInTheDocument();
  });

  it("renders image with correct alt attribute", () => {
    render(<WelcomeCard item={createItem()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "icon");
  });

  it("navigates to different paths based on item", () => {
    render(<WelcomeCard item={createItem({ path: "/articles", title: "Статьи" })} />);
    fireEvent.click(screen.getByText("Статьи"));
    expect(mockPush).toHaveBeenCalledWith("/articles");
  });

  it("calls router.push only once per click", () => {
    render(<WelcomeCard item={createItem()} />);
    const card = screen.getByText("Учиться");
    fireEvent.click(card);
    fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it("renders without errors with minimal item data", () => {
    const minimalItem = {
      id: 0,
      title: "Test",
      type: "test",
      image: { src: "/img.png", width: 50, height: 50 } as unknown as import("next/image").StaticImageData,
      path: "/test",
    };
    render(<WelcomeCard item={minimalItem} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
