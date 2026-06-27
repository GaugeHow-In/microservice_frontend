export type ProfileAvatarKey = "atlas" | "forge" | "nova" | "orbit" | "summit" | "vector";

export type ProfileAvatarOption = {
  key: ProfileAvatarKey;
  label: string;
  url: string;
};

const DICEBEAR_BASE = "https://api.dicebear.com/10.x/notionists-neutral/svg";

export const PROFILE_AVATARS: ProfileAvatarOption[] = [
  {
    key: "atlas",
    label: "Atlas",
    url: `${DICEBEAR_BASE}?seed=GaugeHow-Atlas&backgroundColor=fff6e8`,
  },
  {
    key: "forge",
    label: "Forge",
    url: `${DICEBEAR_BASE}?seed=GaugeHow-Forge&backgroundColor=ffe0b3`,
  },
  {
    key: "nova",
    label: "Nova",
    url: `${DICEBEAR_BASE}?seed=GaugeHow-Nova&backgroundColor=ffc46b`,
  },
  {
    key: "orbit",
    label: "Orbit",
    url: `${DICEBEAR_BASE}?seed=GaugeHow-Orbit&backgroundColor=fff7eb`,
  },
  {
    key: "summit",
    label: "Summit",
    url: `${DICEBEAR_BASE}?seed=GaugeHow-Summit&backgroundColor=f8f0e5`,
  },
  {
    key: "vector",
    label: "Vector",
    url: `${DICEBEAR_BASE}?seed=GaugeHow-Vector&backgroundColor=ebddcc`,
  },
];

export function getProfileAvatar(key?: string | null): ProfileAvatarOption | null {
  if (!key) return null;
  return PROFILE_AVATARS.find((avatar) => avatar.key === key) ?? null;
}
