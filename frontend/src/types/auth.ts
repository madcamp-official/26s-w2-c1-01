import type { User } from "./user";

export interface GithubCallbackResponse {
  accessToken: string;
  user: User;
}
