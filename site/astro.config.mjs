// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	site: "https://chrislacey89.github.io",
	base: "/content-to-skill",
	vite: {
		plugins: [tailwindcss()],
		server: {
			fs: {
				allow: [".."],
			},
		},
	},
});
