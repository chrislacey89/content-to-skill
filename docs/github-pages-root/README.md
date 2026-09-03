# Origin-root files for chrislacey89.github.io

## Why these live here and not in `site/public/`

Crawlers read `/robots.txt` only at the **origin root**. The marketing site is a
GitHub Pages *project* page:

```
https://chrislacey89.github.io/content-to-skill/     <- this repo
https://chrislacey89.github.io/                      <- the origin root
```

Anything this repo publishes lands under `/content-to-skill/`. A `robots.txt`
there is served at `/content-to-skill/robots.txt`, which no crawler requests.
The same constraint applies to `/llms.txt`.

At the time of writing, `https://chrislacey89.github.io/robots.txt` returns a
404 — no user-pages site exists. Under RFC 9309 an absent `robots.txt` is
permissive, so **nothing is currently blocked**; what's missing is the ability
to declare a `Sitemap:` directive.

## How to publish them

Create a user-pages repository named exactly `chrislacey89.github.io`, put
`robots.txt` at its root, and enable GitHub Pages on it. That repo serves the
origin root for every project page on the host, including this one.

```sh
gh repo create chrislacey89/chrislacey89.github.io --public --clone
cp docs/github-pages-root/robots.txt ../chrislacey89.github.io/
# commit, push, then enable Pages on the repo (Settings -> Pages -> main branch)
```

## Verify after publishing

```sh
# Must be 200 with content-type text/plain, and must NOT arrive via a redirect
# to an HTML error page.
curl -sI https://chrislacey89.github.io/robots.txt
curl -s  https://chrislacey89.github.io/robots.txt | grep -i sitemap
```

## Alternative

Pointing a custom domain at this project page achieves the same thing and gives
the site its own origin. There is no accumulated authority to lose by moving
later: `*.github.io` is on the Public Suffix List, so this site has never
inherited ranking signal from `github.io`.
