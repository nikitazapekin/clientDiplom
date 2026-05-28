import { render, screen, fireEvent } from "@testing-library/react";

import AvatarPicker from "@/app/components/AvatarPicker";

const mockDeleteAvatar = jest.fn().mockResolvedValue({ success: true });
const mockUploadAvatar = jest.fn().mockResolvedValue({ imageUrl: "http://example.com/avatar.jpg" });

jest.mock("@/app/http/profile", () => ({
  ProfileService: {
    uploadAvatarBase64: (...args: unknown[]) => mockUploadAvatar(...args),
    deleteAvatarByAuditoryId: (...args: unknown[]) => mockDeleteAvatar(...args),
  },
}));

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  auditoryId: "test-auditory-123",
  onAvatarUploaded: jest.fn(),
};

describe("AvatarPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders nothing when not visible", () => {
    const { container } = render(<AvatarPicker {...defaultProps} visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal content when visible", () => {
    render(<AvatarPicker {...defaultProps} />);
    expect(screen.getByText("Аватар профиля")).toBeInTheDocument();
    expect(screen.getByText("Выбрать из галереи")).toBeInTheDocument();
    expect(screen.getByText("Удалить аватар")).toBeInTheDocument();
    expect(screen.getByText("Отмена")).toBeInTheDocument();
  });

  it("closes modal when clicking overlay", () => {
    const onClose = jest.fn();
    render(<AvatarPicker {...defaultProps} onClose={onClose} />);

    const overlay = document.querySelector("div")!;
    fireEvent.click(overlay);
  });

  it("does not close modal when clicking content", () => {
    const onClose = jest.fn();
    render(<AvatarPicker {...defaultProps} onClose={onClose} />);

    const modalContent = screen.getByText("Аватар профиля").closest("div")!;
    fireEvent.click(modalContent);
  });

  it("opens file picker when gallery option is clicked", () => {
    render(<AvatarPicker {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, "click");

    fireEvent.click(screen.getByText("Выбрать из галереи"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("calls deleteAvatar when remove is confirmed", async () => {
    render(<AvatarPicker {...defaultProps} />);

    fireEvent.click(screen.getByText("Удалить аватар"));

    expect(mockDeleteAvatar).toHaveBeenCalledWith("test-auditory-123");
  });

  it("does not call deleteAvatar when remove is cancelled", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<AvatarPicker {...defaultProps} />);

    fireEvent.click(screen.getByText("Удалить аватар"));

    expect(mockDeleteAvatar).not.toHaveBeenCalled();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = jest.fn();
    render(<AvatarPicker {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("Отмена"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows loading state during operations", () => {
    render(<AvatarPicker {...defaultProps} />);

    fireEvent.click(screen.getByText("Удалить аватар"));

    expect(screen.getByText("Загрузка...")).toBeInTheDocument();
  });
});
