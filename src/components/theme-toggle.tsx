"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { persistTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
  { value: "system", label: "Hệ thống", Icon: Monitor },
];

/**
 * Three explicit states rather than a two-way switch, because "system" is the
 * default and a switch cannot express it — a user on a dark phone would have no
 * way back to "follow my phone" once they touched it.
 *
 * `themePreference` is passed in rather than read from context: the root
 * layout reads the theme cookie via `cookies()` and passes it down as a plain
 * prop, since the App Router has no route-context equivalent to hand it to
 * every caller directly.
 *
 * The server-rendered preference seeds local state; after that this component
 * owns it, since `persistTheme` writes the cookie and toggles the class
 * directly. Nothing is invalidated and no request is made, so switching is
 * instant.
 */
export function ThemeToggle({
  themePreference,
}: {
  themePreference: ThemePreference;
}) {
  const [preference, setPreference] =
    useState<ThemePreference>(themePreference);

  return (
    <ButtonGroup aria-label="Giao diện">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <Button
            key={value}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon"
            // aria-pressed rather than aria-current: these are toggle buttons,
            // and only one is pressed at a time.
            aria-pressed={active}
            aria-label={`Giao diện: ${label}`}
            title={label}
            onClick={() => {
              setPreference(value);
              persistTheme(value);
            }}
          >
            <Icon />
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
