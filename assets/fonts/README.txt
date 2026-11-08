Surprise Night — self-hosted fonts

The site keeps the same Google Fonts families, styles, weights, unicode ranges and font-display settings as the original stylesheets. Downloaded WOFF2 font bytes are unchanged. No glyph subsetting, recompression, renamed font-family, or font-size/layout changes were made.

Font files and stylesheets have content-hash filenames. The browser still downloads only the Unicode font slices it needs. A shared stylesheet contains the exact 949 face declarations common to all five original requests; each page loads only its own original extra declarations. Manifest records source CSS URLs, per-page variants, source font URLs, SHA-256 hashes and byte sizes.

Licenses: all font families are provided under SIL Open Font License 1.1; unchanged license copies are in licenses/. The license text and any reserved font names in each original notice remain applicable. Upstream sources:
- cormorantgaramond — https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- notosanssc — https://github.com/google/fonts/tree/main/ofl/notosanssc
- notoserifsc — https://github.com/google/fonts/tree/main/ofl/notoserifsc
- syne — https://github.com/google/fonts/tree/main/ofl/syne
- jetbrainsmono — https://github.com/google/fonts/tree/main/ofl/jetbrainsmono
- longcang — https://github.com/google/fonts/tree/main/ofl/longcang
- mashanzheng — https://github.com/google/fonts/tree/main/ofl/mashanzheng
- zcoolxiaowei — https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei

Source CSS service: https://fonts.googleapis.com/css2
Source font files: https://fonts.gstatic.com/

Transport-only CSS ordering: common and Yaonan stylesheets interleave independent font-family/style/weight/stretch groups to improve gzip reuse. Every original face declaration remains identical, and the complete original order within every matching group is preserved, including Unicode overlap precedence. No matching groups use overlapping weight ranges. Original self-hosted CSS versions remain in the directory as archived immutable assets.
