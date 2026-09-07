const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

export function generateTicketCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `MML-${code}`;
}

const DISCORD_MESSAGE_LINK_RE =
  /^https:\/\/(?:canary\.|ptb\.)?discord\.com\/channels\/\d+\/\d+\/\d+$/;

export function isValidDiscordMessageLink(link: string) {
  return DISCORD_MESSAGE_LINK_RE.test(link.trim());
}

const DISCORD_SERVER_LINK_RE =
  /^https:\/\/(?:www\.)?discord\.(?:gg|com\/invite)\/[a-zA-Z0-9-]+$/;

export function isValidServerLink(link: string) {
  return DISCORD_SERVER_LINK_RE.test(link.trim());
}
