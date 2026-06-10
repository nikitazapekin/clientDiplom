import { fireEvent,render, screen } from "@testing-library/react";

import Header from "@/app/components/Header";

const mockPush = jest.fn();
let mockPathname = "/problems";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

const setPathname = (path: string) => {
  mockPathname = path;
};

const NAV_ITEMS = [
  { label: "Задачи", path: "/problems" },
  { label: "Учиться", path: "/study" },
  { label: "Статьи", path: "/articles" },
  { label: "Форум", path: "/forum" },
  { label: "Сообщения", path: "/messages" },
  { label: "Профиль", path: "/account" },
];

const ADMIN_NAV_ITEMS = [
  { label: "Курсы", path: "/admin/courses" },
  { label: "Студенты", path: "/admin/students" },
  { label: "Сертификаты", path: "/admin/certificates" },
  { label: "Профиль", path: "/admin/profile" },
  { label: "Для менторов", path: "/admin/mentorship" },
  { label: "Задачи", path: "/admin/coding" },
];

describe("Header", () => {
  beforeEach(() => {
    mockPush.mockReset();
    setPathname("/problems");
  });

  it("renders logos", () => {
    render(<Header />);
    const logos = screen.getAllByAltText("Logo");

    expect(logos).toHaveLength(2);
  });

  it("renders all navigation items", () => {
    render(<Header />);

    for (const item of NAV_ITEMS) {
      const elements = screen.getAllByText(item.label);

      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders logout button", () => {
    render(<Header />);
    const logoutElements = screen.getAllByText("Выход");

    expect(logoutElements.length).toBeGreaterThanOrEqual(1);
  });

  it("highlights active nav item", () => {
    setPathname("/problems");
    render(<Header />);
    const activeElements = screen.getAllByText("Задачи");
    const hasActiveClass = activeElements.some(
      (el) => el.className.includes("active")
    );

    expect(hasActiveClass).toBe(true);
  });

  it("navigates on nav item click", () => {
    render(<Header />);
    const forumElements = screen.getAllByText("Форум");

    fireEvent.click(forumElements[0]);
    expect(mockPush).toHaveBeenCalledWith("/forum");
  });

  it("navigates on logo click", () => {
    render(<Header />);
    const logoButtons = screen.getAllByAltText("Logo");
    const button = logoButtons[0].closest("button");

    fireEvent.click(button!);
    expect(mockPush).toHaveBeenCalledWith("/homepage");
  });

  it("renders admin navigation when on admin path", () => {
    setPathname("/admin/courses");
    render(<Header />);

    for (const item of ADMIN_NAV_ITEMS) {
      const elements = screen.getAllByText(item.label);

      expect(elements.length).toBeGreaterThanOrEqual(1);
    }

    expect(screen.queryByText("Форум")).not.toBeInTheDocument();
  });

  it("highlights active admin nav item", () => {
    setPathname("/admin/courses");
    render(<Header />);
    const activeElements = screen.getAllByText("Курсы");
    const hasActiveClass = activeElements.some(
      (el) => el.className.includes("active")
    );

    expect(hasActiveClass).toBe(true);
  });

  it("opens and closes mobile menu", () => {
    render(<Header />);
    const burgerButton = screen.getByLabelText(/открыть меню/i);

    fireEvent.click(burgerButton);
    const closeButtons = screen.getAllByLabelText(/закрыть меню/i);

    expect(closeButtons.length).toBe(2);
    fireEvent.click(closeButtons[0]);
    expect(screen.getByLabelText(/открыть меню/i)).toBeInTheDocument();
  });

  it("closes mobile menu when overlay is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText(/открыть меню/i));
    const overlay = document.querySelector('[class*="overlay"]');

    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(screen.getByLabelText(/открыть меню/i)).toBeInTheDocument();
  });

  it("closes mobile menu on pathname change", () => {
    const { rerender } = render(<Header />);
    const burgerButton = screen.getByLabelText(/открыть меню/i);

    fireEvent.click(burgerButton);
    setPathname("/study");
    rerender(<Header />);
    expect(screen.getByLabelText(/открыть меню/i)).toBeInTheDocument();
  });

  it("navigates from sidebar item", () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText(/открыть меню/i));
    const studyElements = screen.getAllByText("Учиться");
    const sidebarItem = studyElements.find(
      (el) => el.className.includes("sidebar")
    );

    if (sidebarItem) {
      fireEvent.click(sidebarItem);
    }

    expect(mockPush).toHaveBeenCalledWith("/study");
  });

  it("renders logo in sidebar", () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText(/открыть меню/i));
    const logos = screen.getAllByAltText("Logo");

    expect(logos.length).toBe(2);
  });
});
