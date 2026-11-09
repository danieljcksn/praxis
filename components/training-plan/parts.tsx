import { Card, CardHeader } from "@/components/ui/Card";

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-4 text-sm text-sub-strong marker:text-sub [&>li]:list-disc">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TextCard({
  eyebrow,
  title,
  description,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader eyebrow={eyebrow} tone="hevy" title={title} description={description} />
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1.5 text-sub">{label}</p>
      <div className="text-sm text-sub-strong">{children}</div>
    </div>
  );
}
