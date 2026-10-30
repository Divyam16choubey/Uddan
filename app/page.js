import Image from "next/image";

export default function Home() {
  return (
    <>
      <div className="flex flex-col justify-center items-center text-white h-[44vh] gap-4">
        <div className="font-bold flex gap-2 text-5xl justify-center items-center">Uddan <span><img src="/uddan.gif" width={80} alt="" /></span></div>
        <p>A crowdfunding platform connecting aspiring founders with supporters to turn their ideas into reality. Start Now!</p>
        <div>
          <button type="button" className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">Start Here</button>
          <button type="button" className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-4 py-2.5 text-center me-2 mb-2">Read More</button>
        </div>
      </div>
      <div className="bg-white h-1 opacity-10"></div>

      <div className="text-white container mx-auto pb-20 pt-14">
        <h2 className="text-3xl font-bold text-center mb-14">Turn your vision into reality with the support of your community.</h2>
        <div className="flex gap-5 justify-around">
          <div className="item space-y-3 flex flex-col items-center justify-center">
            <img className="bg-slate-400 rounded-full p-2 text-black" width={80} src="/man.gif" alt="man" />
            <p className="font-bold">Your Community Supports You</p>
            <p className="text-center">Let your supporters contribute and help turn your ideas into reality.</p>
          </div>
          <div className="item space-y-3 flex flex-col items-center justify-center">
            <img className="bg-slate-400 rounded-full p-2 text-black" width={80} src="/coin.gif" alt="coin" />
            <p className="font-bold">Your Community Supports You</p>
            <p className="text-center">Let your supporters contribute and help turn your ideas into reality.</p>
          </div>
          <div className="item space-y-3 flex flex-col items-center justify-center">
            <img className="bg-slate-400 rounded-full p-2 text-black" width={80} src="/group.gif" alt="group" />
            <p className="font-bold">Your Community Supports You</p>
            <p className="text-center">Let your supporters contribute and help turn your ideas into reality.</p>
          </div>
        </div>
      </div>

      <div className="bg-white h-1 opacity-10"></div>

      <div className="text-white container mx-auto pb-20 pt-14 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-center mb-14">Learn more about us</h2>
        <div className="w-[90%] h-[40vh] md:w-[50%] md:h-[40vh] lg:w-[50%] lg:h-[40vh] xl:w-[50%] xl:h-[40vh]">
          <iframe
            className="w-full h-full border-0 rounded-xl"
            src="https://www.youtube.com/embed/8-EyxMuvE9A"
            title="Uddan - Learn More About Crowdfunding"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </>
  );
}
