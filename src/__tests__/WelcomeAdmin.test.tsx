import { render, screen } from "@testing-library/react";

import WelcomeAdmin from "@/app/components/WelcomeAdmin";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("WelcomeAdmin", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders welcome title", () => {
    render(<WelcomeAdmin />);
    expect(screen.getByText("Добро пожаловать в AlgoLab HRM")).toBeInTheDocument();
  });

  it("renders all description texts", () => {
    render(<WelcomeAdmin />);
    expect(
      screen.getByText("Создание и редактирование учебных материалов")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Удобная единая система управления")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Управление над студентами")
    ).toBeInTheDocument();
  });

  it("renders emoji icons", () => {
    render(<WelcomeAdmin />);
    expect(screen.getByText("😊")).toBeInTheDocument();
    expect(screen.getByText("🙌")).toBeInTheDocument();
    expect(screen.getByText("📖")).toBeInTheDocument();
    expect(screen.getByText("👁️")).toBeInTheDocument();
  });

  it("renders all admin navigation cards", () => {
    render(<WelcomeAdmin />);
    expect(screen.getByText("Курсы")).toBeInTheDocument();
    expect(screen.getByText("Студенты")).toBeInTheDocument();
    expect(screen.getByText("Сертификаты")).toBeInTheDocument();
    expect(screen.getByText("Профиль")).toBeInTheDocument();
    expect(screen.getByText("Для менторов")).toBeInTheDocument();
    expect(screen.getByText("Coding Tasks")).toBeInTheDocument();
  });

  it("renders card images for all admin navigation items", () => {
    render(<WelcomeAdmin />);
    const images = screen.getAllByRole("img");

    expect(images).toHaveLength(6);
  });

  it("navigates on card click", () => {
    render(<WelcomeAdmin />);
    const courseCard = screen.getByText("Курсы");

    courseCard.click();
    expect(mockPush).toHaveBeenCalledWith("/admin/courses");
  });
});
