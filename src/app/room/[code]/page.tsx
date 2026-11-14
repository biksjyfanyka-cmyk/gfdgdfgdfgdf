import Game from "@/components/Game";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { code } = await params;
  const { name } = await searchParams;
  return <Game code={code.toUpperCase()} name={name ?? "Ученик"} />;
}
