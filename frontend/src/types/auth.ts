export interface User {
  id: number;
  githubId: string;
  name: string;
  avatarUrl: string;
}

export interface GithubLoginResponse {
  redirectUrl: string;
}

export interface GithubCallbackResponse {
  accessToken: string;
  user: User;
}
