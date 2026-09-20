# QuickCourt video assets

Place cinematic sports footage here:

| File | Sport |
|------|--------|
| `football.mp4` | Football / soccer — player running, dribbling, or shooting |
| `basketball.mp4` | Basketball — dribbling, running, or shooting |
| `cricket.mp4` | Cricket — batsman shot / bat swing |
| `badminton.mp4` | Badminton — movement / racket smash |
| `tennis.mp4` | Tennis — serve / rally / racket movement |

Optional WebM variants:

- `football.webm`, `basketball.webm`, `cricket.webm`, `badminton.webm`, `tennis.webm`

Posters (required fallbacks):

- `posters/football.webp`
- `posters/basketball.webp`
- `posters/cricket.webp`
- `posters/badminton.webp`
- `posters/tennis.webp`

## License requirements

Use royalty-free / appropriately licensed footage only from:

- [Pexels](https://www.pexels.com/videos/)
- [Pixabay](https://pixabay.com/videos/)
- [Coverr](https://coverr.co/)
- [Mixkit](https://mixkit.co/free-stock-video/)

Do **not** use copyrighted broadcasts, watermarked clips, or random YouTube rips.

## Auto download

```bash
node scripts/download-videos.mjs
node scripts/generate-posters.mjs
```

The app never plays all five videos at once — only the active scroll scene is active.
If a video fails to load, its poster (then a branded fallback) is shown automatically.
