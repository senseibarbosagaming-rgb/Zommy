import { useEffect } from "react";
import {
  ageYears,
  diffYears,
  formatNotificationDate,
  getAppPrefs,
  getNotificationCopy,
  getNotificationPermission,
  inSelectedWindow,
  isAllowedChild,
  loadNotificationPrefs,
  loadNotificationUserData,
  readSentKeys,
  sameMonthDay,
  todayIso,
  weeklyDigestCount,
  writeSentKeys,
} from "./notificationCore";

function NotificationScheduler() {
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const prefs = loadNotificationPrefs();
      if (!prefs.enabled || getNotificationPermission() !== "granted") return;
      if (prefs.quietDays?.includes(new Date().getDay())) return;
      if (!inSelectedWindow(prefs.timeSlot)) return;

      const { profiles, entries } = await loadNotificationUserData();
      if (cancelled) return;

      const copy = getNotificationCopy();
      const lang = getAppPrefs().lang === "pt" ? "pt" : "en";
      const todayDate = todayIso();
      const sentKeys = readSentKeys();
      const allowedProfiles = profiles.filter((profile) => isAllowedChild(prefs, profile));
      const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

      if (prefs.types?.onThisDay) {
        entries.forEach((entry) => {
          const profile = profileById[entry.profile_id];
          if (!profile || !isAllowedChild(prefs, profile)) return;
          const years = diffYears(entry.date, todayDate);
          if (!sameMonthDay(entry.date, todayDate) || years <= 0) return;

          const key = `on-this-day:${entry.id}:${todayDate}:${prefs.timeSlot}`;
          const legacyKey = `${entry.id}:${todayDate}:${years}`;
          if (sentKeys.has(key) || sentKeys.has(legacyKey)) return;

          new Notification(copy.onThisDayTitle(years), {
            body: copy.onThisDayBody(profile.name, formatNotificationDate(entry.date, lang)),
            tag: `zommy-${key}`,
          });
          sentKeys.add(key);
          sentKeys.add(legacyKey);
        });
      }

      if (prefs.types?.birthdays) {
        allowedProfiles.forEach((profile) => {
          if (!sameMonthDay(profile.birthdate, todayDate)) return;
          const age = ageYears(profile.birthdate, todayDate);
          if (age <= 0) return;
          const key = `birthday:${profile.id}:${todayDate}:${prefs.timeSlot}`;
          if (sentKeys.has(key)) return;
          new Notification(copy.birthdayTitle(profile.name, age), { body: copy.birthdayBody, tag: `zommy-${key}` });
          sentKeys.add(key);
        });
      }

      if (prefs.types?.weeklyDigest) {
        const day = new Date().getDay();
        const digestEntries = entries.filter((entry) => {
          const profile = profileById[entry.profile_id];
          return profile && isAllowedChild(prefs, profile);
        });
        const count = weeklyDigestCount(digestEntries);
        const key = `weekly-digest:${todayDate.slice(0, 4)}-w${Math.ceil(Number(todayDate.slice(8, 10)) / 7)}:${prefs.timeSlot}`;
        if (day === 0 && count > 0 && !sentKeys.has(key)) {
          new Notification(copy.digestTitle, { body: copy.digestBody(count), tag: `zommy-${key}` });
          sentKeys.add(key);
        }
      }

      writeSentKeys(sentKeys);
    };

    tick();
    const interval = window.setInterval(tick, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}

export default function NotificationControlsLayer() {
  return <NotificationScheduler />;
}
