import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StaticImageData } from "next/image";

import WelcomeCard from "@/app/components/WelcomeCard";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const createItem = (overrides = {}) => ({
  id: 1,
  title: "Учиться",
  type: "study",
  image: { src: "/test.png", width: 100, height: 100 } as unknown as StaticImageData,
  path: "/study",
  ...overrides,
});

describe("WelcomeCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders item title", () => {
    render(<WelcomeCard item={createItem()} />);
    expect(screen.getByText("Учиться")).toBeInTheDocument();
  });

  it("renders item image", () => {
    render(<WelcomeCard item={createItem()} />);
    const img = screen.getByRole("img");

    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "icon");
  });

  it("calls router.push with item path on click", async () => {
    render(<WelcomeCard item={createItem({ path: "/courses" })} />);
    await userEvent.click(screen.getByText("Учиться"));
    expect(mockPush).toHaveBeenCalledWith("/courses");
  });
});
