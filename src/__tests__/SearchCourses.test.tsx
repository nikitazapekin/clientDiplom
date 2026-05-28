import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SearchCourses from "@/app/components/SearchCourses";

describe("SearchCourses", () => {
  const defaultProps = {
    onSearchChange: jest.fn(),
    onSortChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders search input with default placeholder", () => {
    render(<SearchCourses {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Введите название курса")
    ).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    render(<SearchCourses {...defaultProps} placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", async () => {
    render(<SearchCourses {...defaultProps} />);
    const input = screen.getByPlaceholderText("Введите название курса");
    await userEvent.type(input, "react");
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith("react");
  });

  it("renders sort select with default option", () => {
    render(<SearchCourses {...defaultProps} />);
    expect(screen.getByText("По названию")).toBeInTheDocument();
  });

  it("renders custom sort options", () => {
    const sortOptions = [
      { label: "A-Z", value: "alphabet" },
      { label: "Newest", value: "newest" },
    ];
    render(<SearchCourses {...defaultProps} sortOptions={sortOptions} />);
    expect(screen.getByText("A-Z")).toBeInTheDocument();
    expect(screen.getByText("Newest")).toBeInTheDocument();
  });

  it("calls onSortChange when sort option changes", () => {
    const onSortChange = jest.fn();
    render(
      <SearchCourses
        onSearchChange={jest.fn()}
        onSortChange={onSortChange}
        sortOptions={[
          { label: "По названию", value: "alphabet" },
          { label: "По дате", value: "date" },
        ]}
      />
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "date" } });
    expect(onSortChange).toHaveBeenCalledWith("date");
  });

  it("does not render filter button when onApplyFilters is not provided", () => {
    render(<SearchCourses {...defaultProps} />);
    expect(screen.queryByText("Фильтры курсов")).not.toBeInTheDocument();
  });

  it("opens filter modal when filter button is clicked", () => {
    render(
      <SearchCourses {...defaultProps} onApplyFilters={jest.fn()} />
    );
    const filterButton = screen.getByRole("button", { name: "" });
    fireEvent.click(filterButton);
    expect(screen.getByText("Фильтры курсов")).toBeInTheDocument();
  });

  it("renders all filter sections in modal", () => {
    render(
      <SearchCourses {...defaultProps} onApplyFilters={jest.fn()} />
    );
    const filterButton = screen.getAllByRole("button")[0];
    fireEvent.click(filterButton);

    expect(screen.getByText("Ключевые слова")).toBeInTheDocument();
    expect(screen.getByText("Хештеги")).toBeInTheDocument();
    expect(screen.getByText("Количество уроков")).toBeInTheDocument();
    expect(screen.getByText("Количество студентов")).toBeInTheDocument();
    expect(screen.getByText("Дата создания")).toBeInTheDocument();
  });

  it("calls onApplyFilters with draft filter values", () => {
    const onApplyFilters = jest.fn();
    render(
      <SearchCourses {...defaultProps} onApplyFilters={onApplyFilters} />
    );
    const filterButton = screen.getAllByRole("button")[0];
    fireEvent.click(filterButton);

    const keywordInput = screen.getByPlaceholderText("Например: frontend, react");
    fireEvent.change(keywordInput, { target: { value: "react" } });

    fireEvent.click(screen.getByText("Применить"));
    expect(onApplyFilters).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: "react" })
    );
  });

  it("closes filter modal when clicking close button", () => {
    render(
      <SearchCourses {...defaultProps} onApplyFilters={jest.fn()} />
    );
    const filterButton = screen.getAllByRole("button")[0];
    fireEvent.click(filterButton);

    fireEvent.click(screen.getByText("✕"));
    expect(screen.queryByText("Фильтры курсов")).not.toBeInTheDocument();
  });

  it("calls onResetFilters when reset button is clicked", () => {
    const onResetFilters = jest.fn();
    render(
      <SearchCourses
        {...defaultProps}
        onApplyFilters={jest.fn()}
        onResetFilters={onResetFilters}
      />
    );
    const filterButton = screen.getAllByRole("button")[0];
    fireEvent.click(filterButton);

    fireEvent.click(screen.getByText("Сбросить"));
    expect(onResetFilters).toHaveBeenCalled();
  });

  it("shows filter badge when active filters exist", () => {
    const filters = {
      createdFrom: "2026-01-01",
      createdTo: "",
      hashtags: "",
      keywords: "react",
      maxLessons: "",
      maxStudents: "",
      minLessons: "",
      minStudents: "",
    };
    render(
      <SearchCourses
        {...defaultProps}
        onApplyFilters={jest.fn()}
        filters={filters}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show filter badge when no active filters", () => {
    render(
      <SearchCourses {...defaultProps} onApplyFilters={jest.fn()} />
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("updates hashtag filter and strips # symbols", () => {
    const onApplyFilters = jest.fn();
    render(
      <SearchCourses {...defaultProps} onApplyFilters={onApplyFilters} />
    );
    const filterButton = screen.getAllByRole("button")[0];
    fireEvent.click(filterButton);

    const hashtagInput = screen.getByPlaceholderText("Например: javascript, basic");
    fireEvent.change(hashtagInput, { target: { value: "#react" } });

    fireEvent.click(screen.getByText("Применить"));
    expect(onApplyFilters).toHaveBeenCalledWith(
      expect.objectContaining({ hashtags: "react" })
    );
  });

  it("renders range inputs for lessons count", () => {
    render(
      <SearchCourses {...defaultProps} onApplyFilters={jest.fn()} />
    );
    const filterButton = screen.getAllByRole("button")[0];
    fireEvent.click(filterButton);

    const fromInputs = screen.getAllByPlaceholderText("От");
    expect(fromInputs.length).toBeGreaterThanOrEqual(1);
  });
});
