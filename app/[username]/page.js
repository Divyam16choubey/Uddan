"use client"
export default async function Username({ params }) {
  // Await the params promise
  const resolvedParams = await params;
  
  return (
    <div className="text-white">
      {resolvedParams.username}
    </div>
  );
}