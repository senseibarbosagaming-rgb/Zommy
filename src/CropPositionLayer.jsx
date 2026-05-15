import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

const encodePath = (path) => encodeURIComponent(path).replace(/%2F/g, "/");

export default function CropPositionLayer() {
  const positionsRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const loadPositions = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data } = await supabase
        .from("entries")
        .select("photo_path,cover_photo_path,cover_position,photos")
        .eq("user_id", user.id);

      if (!mounted) return;

      positionsRef.current = (data || [])
        .map((entry) => {
          const coverPath = entry.cover_photo_path || entry.photo_path || entry.photos?.[0]?.path;
          const position = entry.cover_position || entry.photos?.[0]?.position || "50% 50%";
          return coverPath ? { path: coverPath, encodedPath: encodePath(coverPath), position } : null;
        })
        .filter(Boolean);
    };

    loadPositions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPositions();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const applyPositions = () => {
      const positions = positionsRef.current;
      if (!positions.length) return;

      document.querySelectorAll("img").forEach((img) => {
        const src = img.currentSrc || img.src || "";
        const match = positions.find(({ path, encodedPath }) => src.includes(encodedPath) || src.includes(path));
        if (!match) return;

        img.style.objectPosition = match.position;
      });
    };

    applyPositions();
    const observer = new MutationObserver(applyPositions);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

    const interval = window.setInterval(applyPositions, 1500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
