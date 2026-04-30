export type ForumQuestionStatus = "open" | "closed";

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  parentId: string | null;
  likes: number;
  dislikes: number;
  hasLiked: boolean;
  hasDisliked: boolean;
  replies: CommunityComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ForumQuestion {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: ForumQuestionStatus;
  authorId: string;
  authorName: string;
  likes: number;
  dislikes: number;
  hasLiked: boolean;
  hasDisliked: boolean;
  commentsCount: number;
  comments?: CommunityComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ForumQuestionsListResponse {
  items: ForumQuestion[];
  total: number;
  page: number;
  pages: number;
}

export interface CreateForumQuestionRequest {
  title: string;
  content: string;
  tags: string[];
}

export interface UpdateForumQuestionRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface CreateForumCommentRequest {
  content: string;
  parentId?: string | null;
}

export interface UpdateForumCommentRequest {
  content: string;
}

export type ArticleBlockType = "text" | "image" | "link" | "table" | "code";

export interface ArticleBlock {
  type: ArticleBlockType;
  data: Record<string, unknown>;
}

export interface Article {
  id: string;
  title: string;
  tags: string[];
  authorId: string;
  authorName: string;
  contentBlocks: ArticleBlock[];
  excerpt: string;
  likes: number;
  dislikes: number;
  hasLiked: boolean;
  hasDisliked: boolean;
  commentsCount: number;
  comments?: CommunityComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ArticlesListResponse {
  items: Article[];
  total: number;
  page: number;
  pages: number;
}

export interface CreateArticleRequest {
  title: string;
  tags: string[];
  contentBlocks: ArticleBlock[];
}

export interface UpdateArticleRequest {
  title?: string;
  tags?: string[];
  contentBlocks?: ArticleBlock[];
}

export interface CreateArticleCommentRequest {
  content: string;
  parentId?: string | null;
}

export interface UpdateArticleCommentRequest {
  content: string;
}
