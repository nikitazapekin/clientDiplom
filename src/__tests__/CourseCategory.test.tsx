import { render, screen } from "@testing-library/react";

import CourseCategory from "@/app/components/CourseCategory";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/app/http/courses", () => ({
  CourseService: {
    getCourseStats: jest.fn().mockResolvedValue({ lessonCount: 0, studentCount: 0 }),
  },
}));

jest.mock("@/app/http/auth", () => ({
  AuthService: {
    getCurrentUser: () => ({ role: "client" }),
  },
}));

const mockCourse = (overrides = {}) => ({
  id: "1",
  title: "JavaScript Basics",
  logo: "",
  lessonCount: 10,
  description: "Learn JS fundamentals",
  tags: ["javascript", "beginner"],
  ...overrides,
});

describe("CourseCategory", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders category title", () => {
    render(<CourseCategory title="Frontend" courses={[]} />);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("renders empty message when no courses", () => {
    render(<CourseCategory title="Backend" courses={[]} />);
    expect(screen.getByText("Курсов пока нету в этой категории")).toBeInTheDocument();
  });

  it("does not show empty message when courses exist", () => {
    render(<CourseCategory title="Frontend" courses={[mockCourse()]} />);
    expect(screen.queryByText("Курсов пока нету в этой категории")).not.toBeInTheDocument();
  });

  it("renders all courses", () => {
    const courses = [
      mockCourse({ id: "1", title: "JS" }),
      mockCourse({ id: "2", title: "TS" }),
      mockCourse({ id: "3", title: "React" }),
    ];
    render(<CourseCategory title="Frontend" courses={courses} />);
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("TS")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders course descriptions", () => {
    const courses = [mockCourse({ description: "Master TypeScript" })];
    render(<CourseCategory title="Frontend" courses={courses} />);
    expect(screen.getByText("Master TypeScript")).toBeInTheDocument();
  });
});
