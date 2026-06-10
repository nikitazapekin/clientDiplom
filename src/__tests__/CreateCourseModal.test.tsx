import { act,fireEvent, render, screen } from "@testing-library/react";

import CreateCourseModal from "@/app/components/CreateCourseModal";

const mockCreateCourse = jest.fn();
const mockUpdateCourses = jest.fn();

jest.mock("@/app/http/courses", () => ({
  CourseService: { createCourse: (...args: unknown[]) => mockCreateCourse(...args) },
}));

jest.mock("@/app/actions/updateCourses", () => ({
  updateCourses: (...args: unknown[]) => mockUpdateCourses(...args),
}));

jest.mock("../app/components/Button", () => {
  const MockButton = ({
    text,
    onClick,
    color,
    width,
    textColor,
    disabled,
  }: {
    text: string;
    onClick?: () => void;
    color?: string;
    width?: string;
    textColor?: string;
    disabled?: boolean;
  }) =>
    React.createElement(
      "button",
      {
        onClick,
        style: { backgroundColor: color, maxWidth: width, color: textColor },
        disabled,
        "data-testid": `button-${text}`,
      },
      text
    );

  return MockButton;
});

import React from "react";

describe("CreateCourseModal", () => {
  const defaultProps = {
    isOpen: true,
    handleOpen: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when not open", () => {
    const { container } = render(
      <CreateCourseModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders modal title when open", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(screen.getByText("Создать курс")).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(screen.getByText("Название курса")).toBeInTheDocument();
    expect(screen.getByText("Краткое описание")).toBeInTheDocument();
    expect(screen.getByText("Подробное описание курса")).toBeInTheDocument();
    expect(screen.getByText("Тип курса")).toBeInTheDocument();
    expect(screen.getByText("Язык программирования")).toBeInTheDocument();
    expect(screen.getByText("Теги")).toBeInTheDocument();
    expect(screen.getByText("Логотип")).toBeInTheDocument();
  });

  it("renders all input fields", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Введите название")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Коротко опишите курс для карточки и списка курсов")
    ).toBeInTheDocument();
  });

  it("renders textarea for full description", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Расскажите, чему посвящён курс/i
    );

    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders course type select", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const selects = screen.getAllByRole("combobox");
    const typeSelect = selects[0];

    expect(typeSelect).toBeInTheDocument();
  });

  it("renders status select", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(screen.getByText("Статус курса")).toBeInTheDocument();
    expect(screen.getByText("Черновик")).toBeInTheDocument();
  });

  it("renders create and cancel buttons", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(screen.getByText("Создать")).toBeInTheDocument();
    expect(screen.getByText("Отмена")).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty title", () => {
    render(<CreateCourseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Создать"));
    expect(screen.getByText("Название курса обязательно")).toBeInTheDocument();
  });

  it("shows validation error when description is empty", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const titleInput = screen.getByPlaceholderText("Введите название");

    fireEvent.change(titleInput, { target: { value: "My Course" } });
    fireEvent.click(screen.getByText("Создать"));
    expect(screen.getByText("Описание курса обязательно")).toBeInTheDocument();
  });

  it("clears error when user starts typing", () => {
    render(<CreateCourseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Создать"));
    expect(screen.getByText("Название курса обязательно")).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText("Введите название");

    fireEvent.change(titleInput, { target: { value: "A" } });
    expect(
      screen.queryByText("Название курса обязательно")
    ).not.toBeInTheDocument();
  });

  it("adds a tag when clicking add button", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const tagInput = screen.getByPlaceholderText("Введите тег");

    fireEvent.change(tagInput, { target: { value: "javascript" } });
    fireEvent.click(screen.getByText("Добавить"));
    expect(screen.getByText("javascript")).toBeInTheDocument();
  });

  it("adds a tag on Enter key press", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const tagInput = screen.getByPlaceholderText("Введите тег");

    fireEvent.change(tagInput, { target: { value: "react" } });
    fireEvent.keyPress(tagInput, { key: "Enter", code: "Enter", charCode: 13 });
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("removes a tag when clicking remove button", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const tagInput = screen.getByPlaceholderText("Введите тег");

    fireEvent.change(tagInput, { target: { value: "javascript" } });
    fireEvent.click(screen.getByText("Добавить"));
    expect(screen.getByText("javascript")).toBeInTheDocument();
    const removeButton = screen.getByText("×");

    fireEvent.click(removeButton);
    expect(screen.queryByText("javascript")).not.toBeInTheDocument();
  });

  it("does not add empty tag", () => {
    render(<CreateCourseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Добавить"));
    expect(screen.queryByText("×")).not.toBeInTheDocument();
  });

  it("calls handleOpen when cancel is clicked", () => {
    const handleOpen = jest.fn();

    render(<CreateCourseModal {...defaultProps} handleOpen={handleOpen} />);
    fireEvent.click(screen.getByText("Отмена"));
    expect(handleOpen).toHaveBeenCalled();
  });

  it("calls handleOpen when overlay is clicked", () => {
    const handleOpen = jest.fn();
    const { container } = render(
      <CreateCourseModal {...defaultProps} handleOpen={handleOpen} />
    );
    const overlay = container.querySelector('[class*="overlay"]');

    if (overlay) {
      fireEvent.click(overlay);
      expect(handleOpen).toHaveBeenCalled();
    }
  });

  it("renders default status as draft", () => {
    render(<CreateCourseModal {...defaultProps} />);
    const statusSelect = screen.getAllByRole("combobox")[2];

    expect(statusSelect).toHaveValue("draft");
  });

  it("renders language options in select", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("renders character counter for textarea", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(screen.getByText("0 символов")).toBeInTheDocument();
  });

  it("renders helper text under textarea", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(
      screen.getByText(
        "Это описание будет показано на странице курса вместо текстовой заглушки."
      )
    ).toBeInTheDocument();
  });

  it("renders image note", () => {
    render(<CreateCourseModal {...defaultProps} />);
    expect(
      screen.getByText(/Поддерживаются форматы: JPG, PNG, GIF/i)
    ).toBeInTheDocument();
  });

  it("shows loading state on submit button when creating", async () => {
    let readerOnloadend: (() => void) | null = null;
    const mockReaderInstance = {
      readAsDataURL: jest.fn(),
      set onloadend(fn: () => void) {
        readerOnloadend = fn;
      },
      get onloadend() {
        return readerOnloadend;
      },
      result: "data:image/png;base64,mockdata",
    };

    jest.spyOn(window, "FileReader").mockImplementation(() => mockReaderInstance as unknown as FileReader);

    mockCreateCourse.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<CreateCourseModal {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText("Введите название");

    fireEvent.change(titleInput, { target: { value: "Test" } });
    const descInput = screen.getByPlaceholderText(
      "Коротко опишите курс для карточки и списка курсов"
    );

    fireEvent.change(descInput, { target: { value: "Test desc" } });
    const fullDesc = screen.getByPlaceholderText(
      /Расскажите, чему посвящён курс/i
    );

    fireEvent.change(fullDesc, {
      target: { value: "Full description content here" },
    });

    const typeSelect = screen.getAllByRole("combobox")[0];

    fireEvent.change(typeSelect, { target: { value: "Практический" } });
    const langSelect = screen.getAllByRole("combobox")[1];

    fireEvent.change(langSelect, { target: { value: "JavaScript" } });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "logo.png", { type: "image/png" });

    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);

    await act(async () => {
      readerOnloadend?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Создать"));
    });

    expect(screen.getByText("Создание...")).toBeInTheDocument();
  });
});
