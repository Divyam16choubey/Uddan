import NextAuth from 'next-auth'
import GitHubProvider from "next-auth/providers/github";
import User from '@/models/User';
import connectDb from '@/db/connectDb';

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === 'github') {
        // user.email is the correct property — the `email` callback param is
        // something different (used for passwordless flows).
        const userEmail = user.email;
        if (!userEmail) {
          // GitHub account has no public email — deny sign-in
          return false;
        }

        try {
          await connectDb();

          const existingUser = await User.findOne({ email: userEmail });
          if (!existingUser) {
            // Create and persist the new user
            await User.create({
              email: userEmail,
              username: userEmail.split('@')[0],
              name: user.name || '',
              profilepic: user.image || '',
            });
          }
        } catch (err) {
          console.error('signIn DB error:', err);
          return false;
        }

        return true;
      }
      return false;
    },

    async session({ session }) {
      // Attach the stored username and role to the session so the rest of the
      // app can use session.user.name as the username identifier and the
      // Navbar can conditionally show the admin link.
      try {
        await connectDb();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.name = dbUser.username;
          session.user.role = dbUser.role || "user";
          session.user.isRestricted = dbUser.isRestricted || false;
        }
      } catch (err) {
        console.error('session DB error:', err);
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
