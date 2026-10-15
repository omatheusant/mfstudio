import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDisplayAgenda, getDisplayOrganization } from "@/features/display/queries";

import { DisplayBoard } from "./_components/display-board";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await getDisplayOrganization(slug);
  return { title: org ? `${org.name} — Painel` : "Painel — MF Studio" };
}

export default async function StudioDisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const organization = await getDisplayOrganization(slug);

  if (!organization) {
    notFound();
  }

  const today = todayISO();
  const slots = await getDisplayAgenda(slug, today);

  return (
    <DisplayBoard slug={slug} organizationName={organization.name} initialSlots={slots} />
  );
}
