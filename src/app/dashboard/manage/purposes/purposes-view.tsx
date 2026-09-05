"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { DimensionManager } from "@/features/dimensions/dimension-manager";
import { PURPOSE_COPY } from "@/features/dimensions/dimension-copy";
import { purposeSchema } from "@/lib/schemas";
import { purposesQueryOptions } from "@/lib/query-options";
import {
  createPurpose,
  deletePurpose,
  updatePurpose,
} from "@/server/purposes.actions";

export function PurposesView() {
  const { data: purposes } = useSuspenseQuery(purposesQueryOptions());

  return (
    <DimensionManager
      entries={purposes}
      copy={PURPOSE_COPY}
      schema={purposeSchema}
      create={createPurpose}
      update={updatePurpose}
      remove={deletePurpose}
    />
  );
}
