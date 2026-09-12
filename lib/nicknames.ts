const ADJECTIVES = [
  "Brave", "Curious", "Quiet", "Sleepy", "Sharp", "Lucky", "Stubborn", "Gentle",
  "Rapid", "Clever", "Bold", "Calm", "Wild", "Patient", "Sunny", "Frosty",
];

const ANIMALS = [
  "Falcon", "Pelican", "Lynx", "Bear", "Stork", "Trout", "Fox", "Heron",
  "Wolf", "Otter", "Owl", "Marten", "Hare", "Eagle", "Badger", "Deer",
];

export function randomNickname(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${a} ${b}`;
}

/** Keep nicknames short, printable and unique-able. */
export function cleanNickname(input: string): string {
  return input.replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 24);
}
