"use client"
import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
    const { data: session } = useSession()
    if (session) {
        return <>
            Signed in as {session.user.email} <br />
            <button onClick={() => signOut()}>Sign Out</button>
        </>
    }
    return (
        <>
            <nav className="bg-blue-950 text-white flex justify-between px-4 h-14 items-center">
                <div className="logo font-bold text-lg flex justify-center items-center">
                    <img src="uddan.gif" width={44} alt="" />
                    <span>Uddan</span>

                </div>
                <div>
                    <Link href={"/login"}>
                        <button className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2 text-center me-2 mb-2">Login</button>
                    </Link>

                </div>

            </nav>
        </>
    )
}

export default Navbar