import React from 'react';

const About = () => {
    return (
        <div className="container mx-auto px-8 md:px-4 py-8">
            <h1 className="text-3xl font-semibold mb-4">About Uddan</h1>

            <p className="text-lg mb-6">
                Uddan is a crowdfunding platform built to help people turn
                their dreams and ideas into reality. We believe that every
                great idea deserves an opportunity to grow. Whether you are
                an aspiring entrepreneur, a creative mind, or someone with
                a vision, Uddan connects you with people who believe in your
                journey and are willing to support your goals. Our mission
                is simple: to make it easier for dreams to take flight
                through the power of community support.
            </p>

            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex items-center mb-6">
                    <img className="w-20 h-20 rounded-full mr-4" src="/group.gif" alt="Community Support" />
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Share Your Vision</h3>
                        <p>
                            Create your profile, share your goals, and tell
                            your story with a community that wants to see
                            you succeed.
                        </p>
                    </div>
                </div>

                <div className="flex items-center mb-6">
                    <img className="w-20 h-20 rounded-full mr-4" src="/coin.gif" alt="Financial Support" />
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Receive Support</h3>
                        <p>
                            Let people who believe in your vision contribute
                            towards your goals and help bring your ideas
                            closer to reality.
                        </p>
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-lg mb-6">
                Our mission is to empower individuals with ideas and ambitions
                by providing a platform where financial support and community
                encouragement come together. We want to break down barriers
                and create opportunities for people who need a helping hand
                to take their next big step.
            </p>

            <h2 className="text-2xl font-semibold mb-4">Benefits for Creators</h2>
            <ul className="list-disc pl-6 mb-6">
                <li className="mb-2">Get financial support to turn your ideas into reality.</li>
                <li className="mb-2">Share your vision and connect with people who believe in it.</li>
                <li className="mb-2">Build a supportive community around your goals.</li>
                <li className="mb-2">Focus on developing your projects with greater confidence.</li>
                <li className="mb-2">Showcase your work and share your progress with supporters.</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">Benefits for Supporters</h2>
            <ul className="list-disc pl-6 mb-6">
                <li className="mb-2">Discover inspiring ideas and ambitious individuals.</li>
                <li className="mb-2">Contribute directly to projects and goals you believe in.</li>
                <li className="mb-2">Become part of someone's journey towards success.</li>
                <li className="mb-2">Make a meaningful difference through your contributions.</li>
                <li className="mb-2">Encourage innovation, creativity, and entrepreneurship.</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">The Power of Community</h2>
            <p className="text-lg mb-6">
                We believe that great things happen when people come together.
                A small contribution from one person, combined with support
                from many others, can create opportunities that once seemed
                impossible. Uddan is more than just a platform for raising
                funds; it is a place where ideas find support, people find
                encouragement, and dreams get the chance to take flight.
            </p>

            <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
            <p className="text-lg mb-6">
                We envision a world where a lack of financial support does
                not stop someone from pursuing a great idea. Through Uddan,
                we aim to build a community that believes in possibilities,
                supports ambition, and helps turn individual dreams into
                shared achievements.
            </p>

            <h2 className="text-2xl font-semibold mb-4">Be a Part of Uddan</h2>
            <p className="text-lg mb-6">
                Every dream begins with an idea, but it takes courage,
                determination, and support to make it happen. Whether you
                have a dream to share or want to help someone achieve theirs,
                Uddan welcomes you. Join us and be a part of a community
                where every contribution can make a difference.
            </p>
        </div>
    );
};

export const metadata = {
    title: "About Us - Uddan",
};

export default About;
