"""Build and verify the published Chrome extension using the Python standard library."""
import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
DOWNLOADS = ROOT / "frontend" / "public" / "download"
DIRECTORY = "rankace-extension"
FILES = {
    "manifest.json", "background.js", "content.js", "overlay.css", "sidepanel.html",
    "sidepanel.js", "README.md", "icons/icon16.png", "icons/icon48.png", "icons/icon128.png",
}


def read_asset(path: Path) -> bytes:
    data = path.read_bytes()
    return data if path.suffix == ".png" else data.replace(b"\r\n", b"\n")


def package(check_only: bool) -> None:
    assets = {name: read_asset(SOURCE / name) for name in sorted(FILES)}
    manifest = json.loads(assets["manifest.json"])
    references = {
        manifest["background"]["service_worker"], manifest["side_panel"]["default_path"],
        *manifest["icons"].values(), *manifest["action"]["default_icon"].values(),
    }
    for script in manifest["content_scripts"]:
        references.update(script.get("js", []))
        references.update(script.get("css", []))
    if not references <= FILES:
        raise ValueError(f"Manifest references missing assets: {sorted(references - FILES)}")

    unpacked = DOWNLOADS / DIRECTORY
    archive_path = DOWNLOADS / f"rankace-extension-v{manifest['version']}.zip"
    if not check_only:
        for name, data in assets.items():
            path = unpacked / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists() or read_asset(path) != data:
                path.write_bytes((SOURCE / name).read_bytes())
        temporary = archive_path.with_suffix(".zip.tmp")
        try:
            with ZipFile(temporary, "w") as archive:
                for name, data in assets.items():
                    archive.writestr(ZipInfo(f"{DIRECTORY}/{name}"), data, compress_type=ZIP_DEFLATED)
            temporary.replace(archive_path)
        finally:
            temporary.unlink(missing_ok=True)

    served = {p.relative_to(unpacked).as_posix() for p in unpacked.rglob("*") if p.is_file()}
    if served != FILES:
        raise ValueError(f"Incorrect unpacked extension file list: {sorted(served ^ FILES)}")
    with ZipFile(archive_path) as archive:
        expected = [f"{DIRECTORY}/{name}" for name in assets]
        if sorted(archive.namelist()) != sorted(expected) or archive.testzip() is not None:
            raise ValueError("Incorrect or damaged extension ZIP")
        for name, data in assets.items():
            if read_asset(unpacked / name) != data or archive.read(f"{DIRECTORY}/{name}") != data:
                raise ValueError(f"Extension asset differs from source: {name}")
    print(f"{archive_path.name}: {len(FILES)} assets match source and unpacked download")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without writing")
    package(parser.parse_args().check)
