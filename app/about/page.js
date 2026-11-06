import React from 'react';
import Link from 'next/link';

/* ── Shared section heading ─────────────────────────────────────── */
const SectionHeading = ({ children }) => (
    <h2 className="text-xl md:text-2xl font-bold text-white mb-3">{children}</h2>
)

/* ── Benefit list item ──────────────────────────────────────────── */
const BenefitItem = ({ children }) => (
    <li className="flex items-start gap-2.5 text-slate-300 text-sm leading-relaxed">
        <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {children}
    </li>
)

const About = () => {
    return (
        <div className="container mx-auto px-6 md:px-10 py-12 max-w-3xl">

            {/* ── Hero block ──────────────────────────────────────── */}
            <div className="mb-10 text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">About Uddan</h1>
                <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                    Uddan is a crowdfunding platform built to help people turn their dreams into
                    reality. We connect aspiring entrepreneurs and creative minds with supporters
                    who believe in their journey.
                </p>
            </div>

            {/* ── How it works ────────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <SectionHeading>How It Works</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-900/60 rounded-full p-2.5 shrink-0">
                            <img className="w-10 h-10" src="/group.gif" alt="Community Support" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-base mb-1">Share Your Vision</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Create your profile, share your goals, and tell your story with a
                                community that wants to see you succeed.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-900/60 rounded-full p-2.5 shrink-0">
                            <img className="w-10 h-10 coin-gif" src="/coin.gif" alt="Financial Support" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-base mb-1">Receive Support</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Let people who believe in your vision contribute towards your goals
                                and help bring your ideas closer to reality.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mission ─────────────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <SectionHeading>Our Mission</SectionHeading>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Our mission is to empower individuals with ideas and ambitions by providing a
                    platform where financial support and community encouragement come together. We
                    want to break down barriers and create opportunities for people who need a
                    helping hand to take their next big step.
                </p>
            </div>

            {/* ── Benefits ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <SectionHeading>For Creators</SectionHeading>
                    <ul className="space-y-3 mt-2">
                        <BenefitItem>Get financial support to turn ideas into reality.</BenefitItem>
                        <BenefitItem>Share your vision with believers who care.</BenefitItem>
                        <BenefitItem>Build a supportive community around your goals.</BenefitItem>
                        <BenefitItem>Focus on building with greater confidence.</BenefitItem>
                        <BenefitItem>Showcase your work and share progress.</BenefitItem>
                    </ul>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <SectionHeading>For Supporters</SectionHeading>
                    <ul className="space-y-3 mt-2">
                        <BenefitItem>Discover inspiring ideas and ambitious people.</BenefitItem>
                        <BenefitItem>Contribute directly to projects you believe in.</BenefitItem>
                        <BenefitItem>Become part of someone&apos;s success story.</BenefitItem>
                        <BenefitItem>Make a meaningful difference with every contribution.</BenefitItem>
                        <BenefitItem>Encourage innovation and entrepreneurship.</BenefitItem>
                    </ul>
                </div>
            </div>

            {/* ── Community + Vision ──────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <SectionHeading>The Power of Community</SectionHeading>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">
                    Great things happen when people come together. A small contribution from one
                    person, combined with support from many others, can create opportunities that
                    once seemed impossible. Uddan is more than just a platform for raising funds —
                    it is a place where ideas find support, people find encouragement, and dreams
                    get the chance to take flight.
                </p>
                <SectionHeading>Our Vision</SectionHeading>
                <p className="text-slate-300 text-sm leading-relaxed">
                    We envision a world where a lack of financial support does not stop someone
                    from pursuing a great idea. Through Uddan, we aim to build a community that
                    believes in possibilities, supports ambition, and helps turn individual dreams
                    into shared achievements.
                </p>
            </div>

            {/* ── CTA ─────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-blue-900/60 to-purple-900/40 border border-white/10 rounded-2xl p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Be a Part of Uddan</h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                    Every dream begins with an idea, but it takes courage, determination, and
                    support to make it happen. Join us and be part of a community where every
                    contribution can make a difference.
                </p>
                <Link href="/login">
                    <button className="bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 transition-all text-white font-semibold rounded-lg px-8 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        Get Started
                    </button>
                </Link>
            </div>

        </div>
    );
};

export const metadata = {
    title: "About Us - Uddan",
};

export default About;
