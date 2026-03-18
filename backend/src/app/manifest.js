export default function manifest() {
  return {
    name: "Neighbourhood Rider",
    short_name: "Neighbourhood Rider",
    description: "Single-admin neighborhood delivery app for Ruaka, Gachie, and Gathiga.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/next.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
