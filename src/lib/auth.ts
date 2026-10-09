import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { env } from "./env";
import { clientIpFrom, rateLimit } from "./rate-limit";

export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

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
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Enforced here (not only in the server action) because NextAuth's
        // /api/auth/callback/credentials endpoint calls authorize directly.
        const email = String(credentials.email).trim().toLowerCase();
        const ip = clientIpFrom(request.headers, env().TRUSTED_PROXY_HOPS);
        if (
          !rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000) ||
          !rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000)
        ) {
          throw new RateLimitedSignin();
        }

        const user = await db.user.findFirst({
          where: {
            email: { equals: email, mode: "insensitive" },
          },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
