const mockPush = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = "/";

export const useRouter = () => ({
  push: mockPush,
  refresh: mockRefresh,
  back: jest.fn(),
  forward: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
});

export const usePathname = () => mockPathname;

export const setMockPathname = (path: string) => {
  mockPathname = path;
};

export const __resetMocks = () => {
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockPathname = "/";
};
