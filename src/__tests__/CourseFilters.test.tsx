import { render, screen, fireEvent } from "@testing-library/react";

import CourseFilters from "@/app/components/CourseFilters";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("CourseFilters", () => {
  const defaultProps = {
    title: "Все курсы",
    description: "Найдите подходящий курс",
    onSearchChange: jest.fn(),
    onSortChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title", () => {
    render(<CourseFilters {...defaultProps} />);
    expect(screen.getByText("Все курсы")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<CourseFilters {...defaultProps} />);
    expect(screen.getByText("Найдите подходящий курс")).toBeInTheDocument();
  });

  it("renders eyebrow when provided", () => {
    render(<CourseFilters {...defaultProps} eyebrow="Популярное" />);
    expect(screen.getByText("Популярное")).toBeInTheDocument();
  });

  it("does not render eyebrow when not provided", () => {
    render(<CourseFilters {...defaultProps} />);
    expect(screen.queryByText("Популярное")).not.toBeInTheDocument();
  });

  it("renders total count when provided as number", () => {
    render(<CourseFilters {...defaultProps} totalCount={42} />);
    expect(screen.getByText(/найдено 42/i)).toBeInTheDocument();
  });

  it("does not render total count when not provided", () => {
    render(<CourseFilters {...defaultProps} />);
    expect(screen.queryByText(/найдено/i)).not.toBeInTheDocument();
  });

  it("renders create button when showCreateButton is true", () => {
    render(<CourseFilters {...defaultProps} showCreateButton handleOpen={jest.fn()} />);
    expect(screen.getByText("Создать курс")).toBeInTheDocument();
  });

  it("does not render create button by default", () => {
    render(<CourseFilters {...defaultProps} />);
    expect(screen.queryByText("Создать курс")).not.toBeInTheDocument();
  });

  it("renders custom ctaLabel", () => {
    render(
      <CourseFilters
        {...defaultProps}
        showCreateButton
        handleOpen={jest.fn()}
        ctaLabel="Новый курс"
      />
    );
    expect(screen.getByText("Новый курс")).toBeInTheDocument();
  });

  it("calls handleOpen when create button is clicked", () => {
    const handleOpen = jest.fn();
    render(<CourseFilters {...defaultProps} showCreateButton handleOpen={handleOpen} />);
    fireEvent.click(screen.getByText("Создать курс"));
    expect(handleOpen).toHaveBeenCalled();
  });

  it("renders sort options", () => {
    const sortOptions = [
      { label: "По названию", value: "alphabet" },
      { label: "По дате", value: "date" },
    ];
    render(<CourseFilters {...defaultProps} sortOptions={sortOptions} />);
    expect(screen.getByText("По названию")).toBeInTheDocument();
    expect(screen.getByText("По дате")).toBeInTheDocument();
  });

  it("renders search placeholder", () => {
    render(<CourseFilters {...defaultProps} searchPlaceholder="Поиск..." />);
    expect(
      screen.getByPlaceholderText("Поиск...")
    ).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<CourseFilters {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Введите название курса")
    ).toBeInTheDocument();
  });
});
