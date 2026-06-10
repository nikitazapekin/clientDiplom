import { act,render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";

import Course from "@/app/components/Course";

const mockPush = jest.fn();
const mockGetCourseStats = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/app/http/courses", () => ({
  CourseService: {
    getCourseStats: (...args: unknown[]) => mockGetCourseStats(...args),
  },
}));

jest.mock("@/app/http/auth", () => ({
  AuthService: {
    getCurrentUser: () => mockGetCurrentUser(),
  },
}));

const baseItem = {
  id: "course-1",
  title: "React Basics",
  logo: "",
  lessonCount: 12,
  tags: ["react", "frontend", "hooks"],
  description: "Learn React from scratch",
  type: "Практический",
  language: "JavaScript",
};

describe("Course", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockReturnValue({ role: "client" });
    mockGetCourseStats.mockResolvedValue({
      lessonCount: 12,
      studentCount: 150,
    });
  });

  it("renders course title", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("React Basics")).toBeInTheDocument();
  });

  it("renders course description", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("Learn React from scratch")).toBeInTheDocument();
  });

  it("renders fallback when no logo", async () => {
    await act(async () => {
      render(<Course item={{ ...baseItem, logo: "" }} />);
    });
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("renders image when logo is provided as data URL", async () => {
    await act(async () => {
      render(
        <Course item={{ ...baseItem, logo: "data:image/png;base64,abc123" }} />
      );
    });
    const img = screen.getByRole("img");

    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "React Basics");
  });

  it("renders image when logo is a full URL", async () => {
    await act(async () => {
      render(
        <Course
          item={{ ...baseItem, logo: "https://example.com/course.png" }}
        />
      );
    });
    const img = screen.getByRole("img");

    expect(img).toBeInTheDocument();
  });

  it("renders type badge", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("Практический")).toBeInTheDocument();
  });

  it("renders language badge", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
  });

  it("renders tags with # prefix", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("#react")).toBeInTheDocument();
    expect(screen.getByText("#frontend")).toBeInTheDocument();
  });

  it("shows hidden tags count", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("does not show hidden tags count when 2 or fewer tags", async () => {
    await act(async () => {
      render(
        <Course item={{ ...baseItem, tags: ["react", "frontend"] }} />
      );
    });
    expect(screen.queryByText("+1")).not.toBeInTheDocument();
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
  });

  it("renders stats after loading", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("shows loading dots while stats load", () => {
    mockGetCourseStats.mockImplementation(
      () => new Promise(() => {})
    );
    render(<Course item={baseItem} />);
    const statValues = screen.getAllByText("...");

    expect(statValues.length).toBe(2);
  });

  it("renders course stats labels", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    expect(screen.getByText("Уроков")).toBeInTheDocument();
    expect(screen.getByText("Студентов")).toBeInTheDocument();
  });

  it("navigates to client course page for client role", async () => {
    mockGetCurrentUser.mockReturnValue({ role: "client" });
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    const article = screen.getByRole("button");

    fireEvent.click(article);
    expect(mockPush).toHaveBeenCalledWith("/study/course-1/course");
  });

  it("navigates to admin course page for admin role", async () => {
    mockGetCurrentUser.mockReturnValue({ role: "admin" });
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    const article = screen.getByRole("button");

    fireEvent.click(article);
    expect(mockPush).toHaveBeenCalledWith("/admin/courses/course-1");
  });

  it("navigates to admin page when isAdmin prop is true", async () => {
    mockGetCurrentUser.mockReturnValue({ role: "client" });
    await act(async () => {
      render(<Course item={baseItem} isAdmin />);
    });
    const article = screen.getByRole("button");

    fireEvent.click(article);
    expect(mockPush).toHaveBeenCalledWith("/admin/courses/course-1");
  });

  it("navigates on Enter key press", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    const article = screen.getByRole("button");

    fireEvent.keyDown(article, { key: "Enter" });
    expect(mockPush).toHaveBeenCalled();
  });

  it("navigates on Space key press", async () => {
    await act(async () => {
      render(<Course item={baseItem} />);
    });
    const article = screen.getByRole("button");

    fireEvent.keyDown(article, { key: " " });
    expect(mockPush).toHaveBeenCalled();
  });

  it("renders subscription badge when subscribed", async () => {
    await act(async () => {
      render(
        <Course
          item={{ ...baseItem, isSubscribed: true, tags: ["react"] }}
        />
      );
    });
    expect(screen.getByText("Вы подписаны")).toBeInTheDocument();
  });

  it("does not render subscription badge for admin", async () => {
    await act(async () => {
      render(
        <Course
          item={{ ...baseItem, isSubscribed: true, tags: ["react"] }}
          isAdmin
        />
      );
    });
    expect(screen.queryByText("Вы подписаны")).not.toBeInTheDocument();
  });

  it("renders admin status badge", async () => {
    await act(async () => {
      render(
        <Course
          item={{
            ...baseItem,
            tags: ["react"],
            status: "draft" as const,
          }}
          isAdmin
        />
      );
    });
    expect(screen.getByText("Черновик")).toBeInTheDocument();
  });

  it("renders default description when none provided", async () => {
    await act(async () => {
      render(
        <Course
          item={{
            ...baseItem,
            description: "",
            tags: ["react"],
          }}
        />
      );
    });
    expect(
      screen.getByText("Описание курса пока не заполнено.")
    ).toBeInTheDocument();
  });

  it("handles stats fetch error gracefully", async () => {
    mockGetCourseStats.mockRejectedValue(new Error("Network error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await act(async () => {
      render(<Course item={{ ...baseItem, tags: ["react"] }} />);
    });
    expect(screen.getByText("0")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("has role button and tabIndex 0", async () => {
    await act(async () => {
      render(<Course item={{ ...baseItem, tags: ["react"] }} />);
    });
    const article = screen.getByRole("button");

    expect(article).toHaveAttribute("tabIndex", "0");
  });
});
