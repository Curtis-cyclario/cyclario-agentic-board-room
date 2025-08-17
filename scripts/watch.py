#!/usr/bin/env python3
import subprocess
import sys
import time
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

ROOT = Path(__file__).resolve().parent.parent
ORG_FILE = ROOT / "org" / "org.yaml"
BUILD_SCRIPT = ROOT / "scripts" / "build_tree.py"
OUTPUT_FILE = ROOT / "output" / "tree.html"


class RebuildOnChange(FileSystemEventHandler):
	def on_any_event(self, event):
		if event.is_directory:
			return
		if event.src_path.endswith(".yaml"):
			print("Change detected, rebuilding...")
			subprocess.run([sys.executable, str(BUILD_SCRIPT), "--in", str(ORG_FILE), "--out", str(OUTPUT_FILE)], check=False)


def main():
	observer = Observer()
	observer.schedule(RebuildOnChange(), str((ROOT / "org").resolve()), recursive=True)
	observer.start()
	print("Watching for changes. Press Ctrl+C to stop.")
	# Initial build
	subprocess.run([sys.executable, str(BUILD_SCRIPT), "--in", str(ORG_FILE), "--out", str(OUTPUT_FILE)], check=False)
	try:
		while True:
			time.sleep(0.5)
	except KeyboardInterrupt:
		observer.stop()
	observer.join()


if __name__ == "__main__":
	main()