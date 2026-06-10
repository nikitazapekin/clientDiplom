import { fireEvent,render, screen } from "@testing-library/react";

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

describe("AvatarPicker extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("calls onAvatarUploaded and onClose on successful file upload", () => {
    const onAvatarUploaded = jest.fn();
    const onClose = jest.fn();

    render(
      <AvatarPicker
        {...defaultProps}
        onAvatarUploaded={onAvatarUploaded}
        onClose={onClose}
      />
    );

    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);
  });

  it("calls onAvatarUploaded with empty string on successful delete", async () => {
    const onAvatarUploaded = jest.fn();
    const onClose = jest.fn();

    mockDeleteAvatar.mockResolvedValue({ success: true });

    render(
      <AvatarPicker
        {...defaultProps}
        onAvatarUploaded={onAvatarUploaded}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText("Удалить аватар"));
    await screen.findByText("Загрузка...");
  });

  it("handles delete error gracefully", async () => {
    mockDeleteAvatar.mockRejectedValue(new Error("Delete failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<AvatarPicker {...defaultProps} />);
    fireEvent.click(screen.getByText("Удалить аватар"));

    await screen.findByText("Загрузка...");
    consoleSpy.mockRestore();
  });

  it("shows loading spinner and text when loading", () => {
    mockDeleteAvatar.mockImplementation(
      () => new Promise(() => {})
    );

    render(<AvatarPicker {...defaultProps} />);
    fireEvent.click(screen.getByText("Удалить аватар"));

    expect(screen.getByText("Загрузка...")).toBeInTheDocument();
  });

  it("hides modal content when loading", () => {
    mockDeleteAvatar.mockImplementation(
      () => new Promise(() => {})
    );

    render(<AvatarPicker {...defaultProps} />);
    fireEvent.click(screen.getByText("Удалить аватар"));

    expect(screen.queryByText("Выбрать из галереи")).not.toBeInTheDocument();
    expect(screen.queryByText("Отмена")).not.toBeInTheDocument();
  });

  it("resets file input after file selection", () => {
    render(<AvatarPicker {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const setSpy = jest.spyOn(fileInput, "value", "set");

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);
    expect(setSpy).toHaveBeenCalledWith("");
  });
});
