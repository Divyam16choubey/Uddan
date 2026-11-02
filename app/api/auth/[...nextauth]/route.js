import mongoose from 'mongoose';
import NextAuth from 'next-auth'
import GitHubProvider from "next-auth/providers/github";
import mongoose from 'mongoose';
import User from '@/models/User';
import Payment from '@/models/Payment';
import connectDb from '@/db/connectDb';

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
          //check if user already exists in the database
          const currentUser = await User.findOne({email: email})
          if(!currentUser){
            //Create a new user
            const newUser = new User({
              email: email,
              username: email.split("@")[0],
            })
          }
          return true
        }
      },
      async session({session, user, token}){
        const dbUser = await User.findOne({email: session.user.email})
        session.user.name = dbUser.username
        return session
      },
    }
  })

  export { authoptions as GET, authoptions as POST}