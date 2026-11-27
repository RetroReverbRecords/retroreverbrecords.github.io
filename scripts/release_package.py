#!/usr/bin/env python3
"""Build a private delivery ZIP from a Bookings details export and local assets."""
import argparse
import json
import stat
import zipfile
from pathlib import Path


def package_release(details_path, assets_dir, output_path):
    details_path = details_path.resolve(strict=True)
    assets_dir = assets_dir.resolve(strict=True)
    output_path = output_path.parent.resolve(strict=True) / output_path.name
    if not assets_dir.is_dir():
        raise ValueError("Choose a directory containing the release assets.")
    if output_path.is_relative_to(assets_dir):
        raise ValueError("Save the ZIP outside the assets folder.")
    details = json.loads(details_path.read_text(encoding="utf-8-sig"))
    if not isinstance(details, dict) or not details.get("title"):
        raise ValueError("Use the details JSON from the release's Bookings row.")

    files = []
    for path in sorted(assets_dir.rglob("*")):
        if path == details_path:
            continue
        if any(part.startswith(".") for part in path.relative_to(assets_dir).parts):
            continue
        mode = path.lstat().st_mode
        if stat.S_ISDIR(mode):
            continue
        if not stat.S_ISREG(mode):
            raise ValueError("The asset directory must contain regular files only.")
        files.append(path)
    if not files:
        raise ValueError("The asset directory contains no files to package.")

    destination = details.get("destination") or (
        "both" if details.get("also_streaming") else
        "streaming" if details.get("form") == "streaming-release" else "bandcamp"
    )
    checklist = [
        "RRR release delivery checklist",
        "",
        "- Confirm the approved release date in Bookings.",
        "- Check audio, artwork, credits, lyrics and rights against the reviewed submission.",
    ]
    if destination in {"bandcamp", "both"}:
        checklist.extend([
            "- Bandcamp: confirm the linked artist page, description, tags and upload responsibility.",
            "- Bandcamp: check the release date and any listening-party arrangements.",
        ])
    if destination in {"streaming", "both"}:
        checklist.extend([
            "- RouteNote: confirm the artist account, title, track order and artwork.",
            "- RouteNote: verify existing UPC and ISRC values where applicable.",
            "- RouteNote: confirm delivery specs and store requirements before upload.",
        ])
    # Omit transport fields and private share URLs from the delivery metadata.
    transport = {"form", "_t", "rrr_trap", "booking_id", "member_free", "free_release", "assets_link"}
    metadata = {key: value for key, value in details.items() if key not in transport}
    metadata["destination"] = destination

    # Exclusive creation protects an existing delivery package.
    with output_path.open("xb") as output:
        try:
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("release.json", json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
                archive.writestr("delivery-checklist.txt", "\n".join(checklist) + "\n")
                for path in files:
                    relative = path.relative_to(assets_dir)
                    archive.write(path, "assets/" + relative.as_posix())
        except BaseException:
            output.close()
            output_path.unlink()
            raise
    return len(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("details", type=Path, help="File containing the release's Bookings details JSON")
    parser.add_argument("assets", type=Path, help="Local folder containing this release's delivery files only")
    parser.add_argument("output", type=Path, help="New output ZIP outside the assets folder")
    args = parser.parse_args()
    try:
        count = package_release(args.details, args.assets, args.output)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Could not package release: {error}\n")
    print(f"Packaged {count} asset file(s).")


if __name__ == "__main__":
    main()
