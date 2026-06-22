#!/usr/bin/env python
"""Generate the three V2 hero images with OpenAI gpt-image (default gpt-image-2).

Run (key inline, never written to disk):
  OPENAI_API_KEY=sk-... ./.venv-gemini/bin/python scripts/generate_v2_heroes_openai.py

Saves public/v2/<concept>/hero.jpg. Cinematic lifestyle/product shots, not literal
UI screens, so no garbled-text issue. The CSS mockups remain the functional spec.
"""
import base64
import os
import sys
from openai import OpenAI

API_KEY = os.environ.get("OPENAI_API_KEY")
if not API_KEY:
    sys.exit("OPENAI_API_KEY not set.")

MODEL = os.environ.get("IMG_MODEL", "gpt-image-2")
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CONCEPTS = {
    "dojo": (
        "Cinematic product photograph, vertical composition. A matte black smartphone "
        "resting on a worn dark oak bench inside a traditional Japanese karate dojo at dusk. "
        "The phone screen glows softly with a minimal, very sparse dark interface: a single "
        "vermilion-red accent bar and one small gold detail, lots of empty black space, no "
        "clutter, no paragraphs of text. Beside the phone, a neatly folded black belt and a "
        "sumi ink calligraphy brush. Deep shadows, warm low-key lighting, a faint red glow, "
        "soft volumetric dust in a single shaft of light, a blurred shoji paper screen in the "
        "background. Disciplined, premium, editorial, sumi-ink mood. 85mm lens, shallow depth "
        "of field. Palette: near-black, cream, vermilion red, antique gold."
    ),
    "tatami": (
        "Bright, airy lifestyle photograph, vertical composition. A smartphone lying on a warm "
        "woven tatami straw mat in a sunlit dojo, next to a crisp folded white karate gi. The "
        "phone screen shows a friendly, clean light interface: warm cream background with one "
        "confident blue accent and a couple of soft rounded cards, simple, uncluttered, minimal "
        "text. Soft natural morning light from a side window, gentle long shadows, calm and "
        "inviting, wholesome, fresh. 50mm lens, shallow depth of field. Palette: warm cream, "
        "azure blue, natural straw tones, white cotton."
    ),
    "kumite": (
        "High-energy athletic product photograph, vertical composition. A sleek black smartphone "
        "in a martial artist's hand inside a dark training gym, dramatic amber rim lighting "
        "slicing through deep shadow. The phone screen shows a bold dark performance dashboard: "
        "large glowing amber numerals and one thin amber progress bar, sporty, dynamic, minimal "
        "text. Sense of motion, sweat and focus, cinematic high contrast, deep blacks with "
        "electric amber highlights and a hint of cool steel blue. 35mm lens. Palette: near-black, "
        "electric amber, cool steel."
    ),
}

client = OpenAI(api_key=API_KEY)

for name, prompt in CONCEPTS.items():
    out_dir = os.path.join(HERE, "public", "v2", name)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "hero.jpg")
    print(f"[{name}] generating with {MODEL}...", flush=True)
    try:
        kwargs = dict(model=MODEL, prompt=prompt, size="1024x1536", n=1)
        try:
            resp = client.images.generate(quality="high", output_format="jpeg", **kwargs)
        except TypeError:
            resp = client.images.generate(**kwargs)
        b64 = resp.data[0].b64_json
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(b64))
        print(f"[{name}] saved -> {out_path}")
    except Exception as e:
        print(f"[{name}] ERROR: {str(e)[:300]}")

print("done")
