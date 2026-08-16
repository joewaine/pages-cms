import type { User } from "@/types/user";

type UserLike = Pick<User, "githubUsername"> | null | undefined;

const hasGithubIdentity = (user: UserLike): boolean => Boolean(user?.githubUsername);

const assertGithubIdentity = (
  user: UserLike,
  message = "Only GitHub users can perform this action.",
) => {
  if (!hasGithubIdentity(user)) {
    throw new Error(message);
  }
};

// Repo administration (collaborators, configuration, actions, cache) is for the
// people running this deployment — ADMIN_EMAILS — not for every client with an
// account, and not for any GitHub user who happens to sign in. The server-side
// checks stay as they are (they require push access on the repo); this keeps the
// chrome itself out of everyone else's sidebar.
type AdminUserLike = (Pick<User, "githubUsername"> & Pick<User, "isAdmin">) | null | undefined;

const canAdminister = (user: AdminUserLike): boolean =>
  hasGithubIdentity(user) && Boolean(user?.isAdmin);

export { hasGithubIdentity, assertGithubIdentity, canAdminister };
