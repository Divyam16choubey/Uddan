import NextAuth from 'next-auth'
import GitHubProvider from "next-auth/providers/github";

export const authoptions =  NextAuth({
    providers: [
      // OAuth authentication providers...
      //now only implemented for github login
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET
      }),
    ]
  })

  export { authoptions as GET, authoptions as POST}