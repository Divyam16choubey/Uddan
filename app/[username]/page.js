import React from 'react'
import PaymentPage from '@/components/PaymentPage'
import { notFound } from "next/navigation"
import connectDb from '@/db/connectDb'
import User from '@/models/User'

// cacheComponents mode uses `instant = false` to opt out of blocking
// prerender (equivalent to `dynamic = 'force-dynamic'` in standard mode).
export const instant = false

const Username = async ({ params }) => {
  // In Next.js 15/16 params is a Promise — await before accessing properties
  const { username } = await params

  await connectDb()
  const u = await User.findOne({ username })
  if (!u) {
    return notFound()
  }

  return (
    <>
      <PaymentPage username={username} />
    </>
  )
}

export default Username

export async function generateMetadata({ params }) {
  // Await params here too — same requirement in Next.js 15/16
  const { username } = await params
  return {
    title: `Support ${username} - Uddan`,
  }
}
