# YMCA Certificate Generator — Sample

This package generates personalized certificates from the supplied `Certified.pdf` template.

## Current sample

The `samples/Digital_Marketing/` folder contains 3 generated certificates:

- Abdurezak Muhadin
- Abenezer Disasa
- Abenezer Shimelis

Each sample has:
- the participant name added as real PDF text
- the course name added as real PDF text
- a unique QR code
- layout-driven positioning with bounding boxes and font fitting

The QR currently points to `https://verify.example.org/c/<certificate-id>` because the verification platform does not exist yet. This is intentionally a placeholder and should be changed when the platform is built.

## Run later for all participants

1. Put the participant CSV files in a folder named `certified_participants/`.
2. Keep `Certified.pdf` in the same project folder.
3. Install dependencies:

```bash
pip install reportlab pypdf qrcode[pil]
```

4. Generate all certificates:

```bash
python generate_certificates.py --template Certified.pdf --participants certified_participants --output generated_certificates --limit 0
```

For a test batch, use `--limit 3`.

## Output

The generator creates course folders and a `certificate_registry.csv`. The registry maps each opaque certificate ID to the participant, course, verification URL, source file, and status.

Duplicate name+course records are not generated twice; they are written to `duplicates_report.csv` for review.

## Layout

Certificate placement is controlled by `config/certificate_layout.json`.

The important fields are:
- participant name box
- course box
- QR box

If a text value does not fit its box at the minimum font size, generation fails instead of silently producing a bad certificate.

## Important

The current verification URL is only a placeholder. Do not distribute these sample certificates as final certificates until the real verification endpoint/domain is available.
