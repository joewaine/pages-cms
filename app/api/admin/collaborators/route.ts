/**
 * Machine-to-machine collaborator provisioning.
 *
 * The build pipeline on Joe's Mac Studio calls this when a client's site goes
 * live, so every client automatically gets the advanced editor for their own
 * site — no manual invite step in the UI. It does exactly what the
 * "Collaborators → invite" server action does (insert a collaborator row keyed
 * by email), minus the interactive session and the invite token: the client
 * signs in with a code at their own convenience and the row is already there.
 *
 * Auth: `Authorization: Bearer ${ADMIN_API_SECRET}`. Without that env var set,
 * the route 404s — no default secret for an endpoint that grants site access.
 * Scope: only repos this GitHub App is installed on can be provisioned.
 */
import { NextRequest, NextResponse } from "next/server";
import { App } from "@octokit/app";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { collaboratorTable, userTable } from "@/db/schema";

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const authorized = (request: NextRequest) => {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false;
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(given) && timingSafeEqual(given, secret);
};

const normalizeEmail = (value: unknown) => {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200 ? email : null;
};

const resolveRepo = async (owner: string, repo: string) => {
  const app = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  });
  // Both calls fail if the app isn't installed on the repo, which is the
  // access check we want: we can only provision what we can already edit.
  const installation = await app.octokit.request("GET /repos/{owner}/{repo}/installation", { owner, repo });
  const installationToken = await app.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    { installation_id: installation.data.id },
  );
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `token ${installationToken.data.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "site-editor-admin",
    },
  });
  if (!repoResponse.ok) throw new Error(`GitHub repo lookup failed (HTTP ${repoResponse.status})`);
  const repoData = await repoResponse.json();
  return {
    installationId: installation.data.id,
    ownerId: repoData.owner.id as number,
    ownerLogin: repoData.owner.login as string,
    ownerType: repoData.owner.type === "User" ? "user" : "org",
    repoId: repoData.id as number,
    repoName: repoData.name as string,
  };
};

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = normalizeEmail(body?.email);
  const owner = String(body?.owner ?? "").trim();
  const repo = String(body?.repo ?? "").trim();
  const remove = Boolean(body?.remove);

  if (!email || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "owner, repo and a valid email are required" }, { status: 400 });
  }

  try {
    const target = await resolveRepo(owner, repo);

    if (remove) {
      await db.delete(collaboratorTable).where(
        and(
          sql`lower(${collaboratorTable.owner}) = lower(${target.ownerLogin})`,
          sql`lower(${collaboratorTable.repo}) = lower(${target.repoName})`,
          sql`lower(${collaboratorTable.email}) = lower(${email})`,
        ),
      );
      return NextResponse.json({ ok: true, removed: true, email, repo: `${target.ownerLogin}/${target.repoName}` });
    }

    const existing = await db.query.collaboratorTable.findFirst({
      where: and(
        sql`lower(${collaboratorTable.owner}) = lower(${target.ownerLogin})`,
        sql`lower(${collaboratorTable.repo}) = lower(${target.repoName})`,
        sql`lower(${collaboratorTable.email}) = lower(${email})`,
      ),
    });
    if (existing) {
      return NextResponse.json({ ok: true, created: false, id: existing.id, email, repo: `${target.ownerLogin}/${target.repoName}` });
    }

    // Link straight to an account if the client has already signed in once.
    const user = await db.query.userTable.findFirst({
      where: sql`lower(${userTable.email}) = lower(${email})`,
    });

    const inserted = await db.insert(collaboratorTable).values({
      type: target.ownerType,
      installationId: target.installationId,
      ownerId: target.ownerId,
      repoId: target.repoId,
      owner: target.ownerLogin,
      repo: target.repoName,
      email,
      userId: user?.id ?? null,
      invitedBy: null,
    }).returning();

    return NextResponse.json({
      ok: true,
      created: true,
      id: inserted[0]?.id ?? null,
      email,
      repo: `${target.ownerLogin}/${target.repoName}`,
      linkedToExistingUser: Boolean(user),
    });
  } catch (error: any) {
    const message = String(error?.message ?? error);
    const notInstalled = /Not Found|installation/i.test(message);
    return NextResponse.json(
      { error: notInstalled ? `The Site Editor app is not installed on ${owner}/${repo}` : message },
      { status: notInstalled ? 409 : 500 },
    );
  }
}

// Listing is handy for checking what a client can reach before emailing them.
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const email = normalizeEmail(request.nextUrl.searchParams.get("email"));
  const rows = await db.query.collaboratorTable.findMany({
    where: email ? sql`lower(${collaboratorTable.email}) = lower(${email})` : undefined,
  });
  return NextResponse.json({
    collaborators: rows.map((row) => ({
      id: row.id, email: row.email, owner: row.owner, repo: row.repo, userId: row.userId,
    })),
  });
}
