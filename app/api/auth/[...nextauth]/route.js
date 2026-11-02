import mongoose from 'mongoose';
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
    ],
    callbacks: {
      async signIn({user, account, profile, email, credentials}) {
        if(account.provider == 'github'){
          //conncect to the database
          const client = await mongoose.connect()
        }
      }
    }
  })

  export { authoptions as GET, authoptions as POST}