export interface LeaderboardEntry {
  id: string;
  clientId: string;
  auditoryId: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  fullName: string;
  score: number;
  rank: number;
  level: number;
  avatarUrl?: string | null;
  avatarMimeType?: string | null;
}

export interface LeaderboardResponse {
  leaders: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalStudents: number;
  page: number;
  limit: number;
  totalPages: number;
}
