"""Generate PlanSobrio favicon set + og:image.

Run: python3 tools/gen_brand_assets.py
Outputs into /app/frontend/public/:
  favicon.ico
  favicon-192.png
  favicon-512.png
  apple-touch-icon.png (180x180)
  og.png (1200x630)
  site.webmanifest
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io

OUT = Path("/app/frontend/public")
OUT.mkdir(parents=True, exist_ok=True)

BG = (11, 12, 16, 255)           # #0B0C10
CORAL = (255, 107, 94, 255)      # #FF6B5E
VIOLET = (139, 92, 246, 255)     # #8B5CF6
MINT = (74, 222, 128, 255)       # #4ADE80
WHITE = (255, 255, 255, 255)
MUTED = (199, 203, 214, 255)


def gradient_stop(t: float, a, b):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def make_gradient_square(size: int) -> Image.Image:
    """Rounded square in coral→violet vertical gradient."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Fill with vertical gradient into a mask
    for y in range(size):
        t = y / max(1, size - 1)
        draw.line([(0, y), (size, y)], fill=gradient_stop(t, CORAL, VIOLET))
    # Round corners via mask
    radius = int(size * 0.24)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def draw_sprout(canvas: Image.Image, cx: int, cy: int, scale: float, color=WHITE):
    """Sprout: two round leaves + a curved stem, centered near (cx,cy).
    Rendered at 4x with antialiasing then downscaled for clean edges."""
    W = canvas.size[0]
    # Render on a 4x supersampled surface for smooth edges
    ss = 4
    S = W * ss
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    scx = int(cx * ss)
    scy = int(cy * ss)
    s = scale * ss

    stem_w = max(4, int(6 * s))
    stem_len = int(38 * s)
    # Straight-ish stem
    stem_top = scy + int(6 * s)
    stem_bot = stem_top + stem_len
    d.rounded_rectangle(
        [scx - stem_w // 2, stem_top, scx + stem_w // 2, stem_bot],
        radius=stem_w // 2, fill=color,
    )
    # Two symmetric round leaves rising from stem top
    leaf_r = int(18 * s)  # radius
    offset_x = int(15 * s)
    offset_y = int(8 * s)
    for sign in (-1, 1):
        lx = scx + sign * offset_x
        ly = scy - offset_y
        d.ellipse([lx - leaf_r, ly - int(leaf_r * 0.75), lx + leaf_r, ly + int(leaf_r * 0.75)], fill=color)
    # Small central "bud" where they meet
    bud_r = int(6 * s)
    d.ellipse([scx - bud_r, scy - bud_r + int(2 * s), scx + bud_r, scy + bud_r + int(2 * s)], fill=color)

    # Downsample to canvas
    layer = layer.resize((W, W), Image.LANCZOS)
    canvas.alpha_composite(layer)


def make_icon(size: int, with_bg: bool = True) -> Image.Image:
    """Sprout icon inside gradient rounded square. If with_bg=False, transparent bg."""
    if with_bg:
        canvas = make_gradient_square(size)
    else:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_sprout(canvas, size // 2, int(size * 0.42), scale=size / 96.0, color=WHITE)
    return canvas


def try_font(size: int, bold: bool = False):
    """Try common serif/sans fonts, fall back to default."""
    candidates_bold = [
        "/usr/share/fonts/truetype/dejavu/DejaVu-Sans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]
    candidates_reg = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for p in (candidates_bold if bold else candidates_reg):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def make_og() -> Image.Image:
    """1200x630 hero for social sharing."""
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Radial-ish glow via alpha-composited layers, softened with heavy Gaussian blur
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    # Coral orb top-left (single solid circle, blurred heavily)
    gdraw.ellipse([-260, -260, 520, 520], fill=(255, 107, 94, 180))
    # Violet orb bottom-right
    gdraw.ellipse([W - 500, H - 500, W + 240, H + 240], fill=(139, 92, 246, 180))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=180))
    img.alpha_composite(glow)

    # Logo icon (128px) top left
    icon = make_icon(128)
    img.paste(icon, (80, 100), icon)
    # Brand text
    brand_font = try_font(60, bold=True)
    d.text((228, 118), "PlanSobrio", font=brand_font, fill=WHITE)

    # Big headline
    title_font = try_font(80, bold=True)
    d.text((80, 280), "Conoce gente que", font=title_font, fill=WHITE)
    # Two-color line: "vive sin" (coral→violet gradient) + "alcohol ni drogas" white
    d.text((80, 370), "vive sin alcohol", font=title_font, fill=(255, 107, 94, 255))
    d.text((80, 460), "ni drogas.", font=title_font, fill=(139, 92, 246, 255))

    # Beta badge bottom
    badge_font = try_font(22, bold=True)
    badge_text = "BETA GRATIS · CHILE"
    tw = d.textlength(badge_text, font=badge_font)
    bx, by = 80, H - 60
    d.rounded_rectangle([bx, by - 6, bx + tw + 32, by + 32], radius=999,
                        outline=MINT, width=2)
    d.text((bx + 16, by), badge_text, font=badge_font, fill=MINT)

    return img.convert("RGB")


def main():
    # Favicons
    for size in (192, 512):
        make_icon(size).save(OUT / f"favicon-{size}.png")
    make_icon(180).save(OUT / "apple-touch-icon.png")

    # favicon.ico (multi-size)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_img = make_icon(64)
    ico_img.save(OUT / "favicon.ico", format="ICO", sizes=ico_sizes)

    # OG image
    og = make_og()
    og.save(OUT / "og.png", format="PNG", optimize=True)

    # Web manifest
    manifest = """{
  "name": "PlanSobrio",
  "short_name": "PlanSobrio",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0B0C10",
  "background_color": "#0B0C10",
  "icons": [
    { "src": "/favicon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
"""
    (OUT / "site.webmanifest").write_text(manifest)
    print("✓ Wrote:")
    for f in sorted(OUT.glob("*")):
        if f.suffix in (".png", ".ico") or f.name == "site.webmanifest":
            print("  ", f.name, f.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
