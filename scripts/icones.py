"""Génère un petit sous-ensemble des icônes Flaticon UIcons utilisées par l'appli.

Usage : python3 scripts/icones.py  (nécessite fonttools + brotli)
Ajoutez un nom dans ICONES puis relancez le script.
"""
import re
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

RACINE = Path(__file__).resolve().parent.parent
PKG = RACINE / "node_modules/@flaticon/flaticon-uicons/css"

ICONES = {
    "rr": [
        "shopping-bag", "angle-small-right", "arrow-small-left", "spinner", "box-open", "marker",
        "shop", "leaf", "hand-holding-usd", "moped", "download", "sign-out-alt", "phone-call",
        "plus", "search", "clock", "wallet", "chart-line-up", "trash", "check-circle", "copy-alt",
        "rotate-right", "sign-in-alt", "check", "cookie", "star", "heart", "time-fast", "angle-small-down",
        "user", "smartphone", "comment-alt",
        "pencil", "eye", "eye-crossed", "camera", "picture", "users-alt", "chart-pie", "filter", "calendar",
        "angle-small-left", "cross-small", "exclamation", "tags", "box-alt", "arrow-small-up", "arrow-small-down",
        "sort-alt", "chart-histogram", "truck-side", "user-add", "hourglass-end", "restaurant", "layers",
    ],
    "sr": ["check-circle", "star", "shopping-bag", "cookie", "heart", "flame"],
    "brands": ["whatsapp"],
}
SOURCES = {
    "rr": ("regular/rounded.css", "fi-rr-"),
    "sr": ("solid/rounded.css", "fi-sr-"),
    "brands": ("brands/all.css", "fi-brands-"),
}

css = [
    "/* Généré par scripts/icones.py — icônes Flaticon UIcons (https://www.flaticon.com/uicons) */",
    ".icone{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;font-size:1.25em;font-style:normal}",
    ".icone::before{display:block;line-height:1;font-weight:400;-webkit-font-smoothing:antialiased}",
]
noms_ts = []
for style, noms in ICONES.items():
    fichier, prefixe = SOURCES[style]
    texte = (PKG / fichier).read_text()
    police = re.search(r'url\(\.\./(uicons-[a-z-]+-[A-Z0-9]+\.woff2)\)', texte).group(1)
    codes = {}
    for nom in noms:
        m = re.search(re.escape(prefixe + nom) + r':before\{content:"\\([0-9a-f]+)"\}', texte)
        if not m:
            raise SystemExit(f"Icône introuvable : {prefixe}{nom}")
        codes[nom] = m.group(1)
    font = TTFont(PKG / police)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = []
    opts.name_IDs = []
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[int(c, 16) for c in codes.values()])
    sub.subset(font)
    sortie = RACINE / f"src/assets/fonts/uicons-{style}.woff2"
    font.flavor = "woff2"
    font.save(sortie)
    famille = f"uicons-diana-{style}"
    css.append(f'@font-face{{font-family:"{famille}";src:url("./assets/fonts/uicons-{style}.woff2") format("woff2");font-display:block}}')
    css.append(f'.icone[class*=" {prefixe}"]::before{{font-family:"{famille}"}}')
    for nom, code in codes.items():
        css.append(f'.{prefixe}{nom}::before{{content:"\\{code}"}}')
        noms_ts.append(f'"{style}:{nom}"')
    print(style, len(codes), "icônes ->", sortie.stat().st_size, "octets")

(RACINE / "src/icones.css").write_text(css[0] + "\n@layer base{\n" + "\n".join(css[1:]) + "\n}\n")
(RACINE / "src/components/icones-noms.ts").write_text(
    "// Généré par scripts/icones.py — ne pas modifier à la main.\n"
    "export type NomIcone =\n  | " + "\n  | ".join(noms_ts) + ";\n"
)
