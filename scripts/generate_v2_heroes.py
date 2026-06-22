#!/usr/bin/env python
"""Generate art-directed hero images for the three V2 design directions.

Run (key passed inline so it is never written to disk):
  GEMINI_API_KEY=xxxx ./.venv-gemini/bin/python scripts/generate_v2_heroes.py

Saves to public/v2/<concept>/hero.jpg (Gemini returns JPEG).
These are cinematic lifestyle/product shots, NOT literal UI screens, so there is
no garbled-text problem. The real CSS mockups remain the functional spec.
"""
import os
import sys
from google import genai
from google.genai import types

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    sys.exit("GEMINI_API_KEY not set. Run: GEMINI_API_KEY=xxxx ./.venv-gemini/bin/python scripts/generate_v2_heroes.py")

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CONCEPTS = {
    "dojo": (
        "Cinematic product photograph, vertical 4:5 composition. A matte black smartphone "
        "resting on a worn dark oak bench inside a traditional Japanese karate dojo at dusk. "
        "The phone screen glows softly with a minimal, very sparse dark interface: a single "
        "vermilion-red accent bar and one small gold detail, lots of empty black space, no "
        "clutter, no paragraphs of text. Beside the phone, a neatly folded black belt (obi) and "
        "a sumi ink calligraphy brush. Deep shadows, warm low-key lighting, a faint hinomaru-red "
        "glow, soft volumetric dust in a single shaft of light, a blurred shoji paper screen in "
        "the background. Disciplined, premium, editorial, sumi-ink mood. 85mm lens, shallow depth "
        "of field. Palette: sumi black #15110F, gi cream, hinomaru red #D23B2C, belt gold #C8A24B."
    ),
    "tatami": (
        "Bright, airy lifestyle photograph, vertical 4:5 composition. A smartphone lying on a warm "
        "woven tatami straw mat in a sunlit dojo, next to a crisp folded white karate gi. The phone "
        "screen shows a friendly, clean light interface: warm cream background with one confident "
        "blue accent and a couple of soft rounded cards, simple and uncluttered, minimal text. Soft "
        "natural morning light from a side window, gentle long shadows, calm and inviting, wholesome, "
        "fresh. 50mm lens, shallow depth of field. Palette: warm cream paper #FBF6EC, azure blue "
        "#2E6FB5, natural straw tones, white cotton gi."
    ),
    "kumite": (
        "High-energy athletic product photograph, vertical 4:5 composition. A sleek black smartphone "
        "in a martial artist's hand inside a dark training gym, dramatic amber rim lighting slicing "
        "through deep shadow. The phone screen shows a bold dark performance dashboard: large glowing "
        "amber numerals and one thin amber progress bar, sporty, dynamic, minimal text. Sense of motion, "
        "sweat and focus, cinematic high contrast, deep blacks with electric amber highlights and a hint "
        "of cool steel blue. 35mm lens. Palette: near-black #0A0C0F, electric amber #FFB81C, cool steel "
        "accents."
    ),
}

client = genai.Client(api_key=API_KEY)

for name, prompt in CONCEPTS.items():
    out_dir = os.path.join(HERE, "public", "v2", name)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "hero.jpg")
    print(f"[{name}] generating...", flush=True)
    try:
        resp = client.models.generate_content(
            model=os.environ.get("IMG_MODEL", "gemini-2.5-flash-image-preview"),
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="4:5"),
            ),
        )
        saved = False
        for part in resp.parts:
            if getattr(part, "text", None):
                print(f"[{name}] note: {part.text.strip()[:120]}")
            elif getattr(part, "inline_data", None):
                part.as_image().save(out_path)
                print(f"[{name}] saved -> {out_path}")
                saved = True
        if not saved:
            print(f"[{name}] WARNING: no image returned")
    except Exception as e:
        print(f"[{name}] ERROR: {e}")

print("done")
