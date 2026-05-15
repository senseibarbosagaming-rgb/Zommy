import { supabase } from "./supabase";

const titleCase = (value) => value
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export const memberDisplayName = (member, fallback = "Family") => {
  const email = member?.email || "";
  const source = member?.full_name || member?.name || (email ? email.split("@")[0] : fallback);
  const cleaned = String(source).replace(/[._-]+/g, " ").trim();
  return titleCase(cleaned || fallback);
};

export const listFamilyMembers = async (profileId) => {
  if (!profileId) return [];
  const { data, error } = await supabase.rpc("list_profile_members", { target_profile_id: profileId });
  if (error) {
    console.error("Failed to load family circle", error);
    return [];
  }
  return data || [];
};

export const loadFamilyMemberLabels = async (profiles = []) => {
  const groups = await Promise.all((profiles || []).map(async (profile) => {
    const members = await listFamilyMembers(profile.id);
    return [profile.id, members];
  }));

  return groups.reduce((labels, [profileId, members]) => {
    members.forEach((member) => {
      if (member?.user_id) labels[`${profileId}:${member.user_id}`] = memberDisplayName(member);
    });
    return labels;
  }, {});
};
