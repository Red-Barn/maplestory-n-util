import CharacterTabs from "@/components/CharacterTabs";

export default async function CharacterLayout({ children, params }: LayoutProps<"/character/[assetKey]">) {
  const { assetKey } = await params;
  return (
    <>
      <CharacterTabs assetKey={assetKey} />
      {children}
    </>
  );
}
