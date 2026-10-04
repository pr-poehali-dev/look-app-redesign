export const normCity = (c?: string | null) => (c || "").trim().toLowerCase().replace(/ё/g, "е");

export const detectCity = (): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("no-geo")); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=ru&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
          const data = await (await fetch(url)).json();
          const a = data?.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.state || "";
          if (city) resolve(String(city)); else reject(new Error("no-city"));
        } catch (e) { reject(e); }
      },
      (err) => reject(err),
      { timeout: 10000, maximumAge: 600000 }
    );
  });
