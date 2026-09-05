"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { DimensionManager } from "@/features/dimensions/dimension-manager";
import { FUNDING_SOURCE_COPY } from "@/features/dimensions/dimension-copy";
import { fundingSourceSchema } from "@/lib/schemas";
import { fundingSourcesQueryOptions } from "@/lib/query-options";
import {
  createFundingSource,
  deleteFundingSource,
  updateFundingSource,
} from "@/server/funding-sources.actions";

export function FundingSourcesView() {
  const { data: fundingSources } = useSuspenseQuery(
    fundingSourcesQueryOptions()
  );

  return (
    <DimensionManager
      entries={fundingSources}
      copy={FUNDING_SOURCE_COPY}
      schema={fundingSourceSchema}
      create={createFundingSource}
      update={updateFundingSource}
      remove={deleteFundingSource}
    />
  );
}
