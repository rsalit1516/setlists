import { getSongs } from "@/lib/services/songs";

export default async function SongsPage() {
  const songs = await getSongs();

  return (
    <div>
      <h1>Songs</h1>
      <pre>{JSON.stringify(songs, null, 2)}</pre>
    </div>
  );
}
