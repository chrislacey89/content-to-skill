// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	site: "https://chrislacey89.github.io",
	// Keep this WITHOUT a trailing slash. `src/lib/content.ts` and other call
	// sites concatenate onto import.meta.env.BASE_URL; a trailing slash here
	// silently produces protocol-relative "//path" URLs.
	base: "/content-to-skill",
	// GitHub Pages serves the directory form (".../content-to-skill/"), so emit
	// canonicals that match the URL actually served rather than one that 301s.
	trailingSlash: "always",
	integrations: [sitemap()],
	experimental: {
		fonts: [
			{
				provider: fontProviders.google(),
				name: "Lora",
				cssVariable: "--font-display",
				weights: [400, 600],
				styles: ["normal"],
				subsets: ["latin"],
			},
			{
				provider: fontProviders.google(),
				name: "Old Standard TT",
				cssVariable: "--font-body",
				// Only 300/400/600 are used on the page; italics are synthesised
				// for the single <em>, which is cheaper than shipping a face.
				weights: [400],
				styles: ["normal"],
				subsets: ["latin"],
			},
			{
				provider: fontProviders.google(),
				name: "JetBrains Mono",
				cssVariable: "--font-mono",
				weights: [400],
				styles: ["normal"],
				subsets: ["latin"],
			},
		],
	},
	vite: {
		plugins: [tailwindcss()],
		server: {
			fs: {
				allow: [".."],
			},
		},
	},
});
