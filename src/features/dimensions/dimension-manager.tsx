"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DimensionList,
  type DimensionEntry,
} from "@/features/dimensions/dimension-list";
import { DimensionForm } from "@/features/dimensions/dimension-form";
import type {
  DimensionCopy,
  DimensionSchema,
} from "@/features/dimensions/dimension-copy";
import type { ActionState } from "@/lib/types";

/**
 * One dimension's management screen: a create form, then the list.
 *
 * The two dimensions get their own route each rather than two tabs of one
 * screen, so nothing about the layout invites reading a Funding Source as a
 * kind of Purpose — which is precisely the confusion the tree created by
 * putting both in one list at different depths.
 */
export function DimensionManager({
  entries,
  copy,
  schema,
  create,
  update,
  remove,
}: {
  entries: DimensionEntry[];
  copy: DimensionCopy;
  schema: DimensionSchema;
  create: (input: { name: string }) => Promise<ActionState>;
  update: (id: string, input: { name: string }) => Promise<ActionState>;
  remove: (id: string) => Promise<ActionState>;
}) {
  return (
    <div className="space-y-6">
      {/*
       * The create form is boxed and titled so it reads as its own thing.
       * Left bare above the list it looked like a toolbar acting on the list
       * below.
       *
       * No <h1> here: the layout above already owns it, and the active tab
       * names this screen.
       */}
      <Card>
        <CardHeader>
          <CardTitle>{copy.createLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <DimensionForm
            copy={copy}
            schema={schema}
            create={create}
            update={update}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold tracking-tight">
          {copy.plural}
          {entries.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {entries.length}
            </span>
          )}
        </h2>
        <DimensionList
          entries={entries}
          copy={copy}
          schema={schema}
          create={create}
          update={update}
          remove={remove}
        />
      </section>
    </div>
  );
}
