// Keep a safety margin under Discord's actual 2000-char message limit.
const DISCORD_MESSAGE_LIMIT = 1900;

export type DiscordItemGroup = {
  name: string;
  lines: string[];
};

// Packs item groups into as few messages as possible without ever splitting
// a single ticket's line across two messages. A group's header is only
// placed if at least its first line fits alongside it in the same batch —
// otherwise the whole group starts fresh in the next batch — so a header
// never ends up alone with nothing under it. A group that's still too big
// to fit in one batch simply continues into the next (no header repeated).
export function buildDiscordBatches(groups: DiscordItemGroup[]): string[] {
  const batches: string[] = [];
  let current = "";

  function flush() {
    if (current) batches.push(current);
    current = "";
  }

  function append(text: string) {
    const candidate = current ? `${current}\n${text}` : text;
    if (candidate.length > DISCORD_MESSAGE_LIMIT) {
      flush();
      // A single line longer than the whole limit can't be split safely
      // either — send it alone rather than dropping it.
      current = text.length > DISCORD_MESSAGE_LIMIT ? text.slice(0, DISCORD_MESSAGE_LIMIT) : text;
    } else {
      current = candidate;
    }
  }

  for (const group of groups) {
    if (group.lines.length === 0) continue;

    const header = `**${group.name}**`;
    const headerPlusFirst = current
      ? `${current}\n${header}\n${group.lines[0]}`
      : `${header}\n${group.lines[0]}`;
    if (headerPlusFirst.length > DISCORD_MESSAGE_LIMIT) {
      flush();
    }

    append(header);
    for (const line of group.lines) {
      append(line);
    }
  }

  flush();
  return batches;
}

export async function sendDiscordBatches(webhookUrl: string, batches: string[]) {
  for (let i = 0; i < batches.length; i++) {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: batches[i] }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Discord rejected message ${i + 1}/${batches.length} (${res.status}): ${text.slice(0, 200)}`);
    }
    // Stay well under Discord's per-webhook rate limit when sending several
    // messages back to back.
    if (i < batches.length - 1) await new Promise((r) => setTimeout(r, 400));
  }
}
