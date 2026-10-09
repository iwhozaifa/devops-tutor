import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { authorizeCredentials } from "./credentials";
import { refreshSessionToken } from "./session";

export { RateLimitedSignin } from "./credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Only offered when configured; otherwise it fails at sign-in time
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? [GitHub] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials, request) => authorizeCredentials(credentials, request.headers),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Sign-in: remember which password generation this session belongs to
        token.id = user.id;
        token.ver = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        token.verCheckedAt = Date.now();
        return token;
      }
      // Ends the session (null) after a password reset or account deletion
      return refreshSessionToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
