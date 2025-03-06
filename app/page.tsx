import AudioUploader from "@/components/AudioUploader";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto">
        <AudioUploader />
      </div>
    </main>
  );
}
