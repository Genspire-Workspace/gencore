---
name: computer-use
description: Uses trusted local tools to inspect files in data/test-directory, list images, find a design file, and play audio.
license: internal
compatibility: playground-ai verify script
allowed-tools: bash read list
---

# Computer Use

Use the trusted computer-use tools to inspect the provided directory.

## Rules

- Stay within the provided target directory.
- Use `list` to enumerate files recursively.
- Use `read` to inspect a discovered file and confirm details such as filename, extension, and size.
- Use `bash` only when you need to open a local file, such as playing an audio file from the target directory.
- Do not guess filenames or invent paths.
- After the tools finish, answer using the exact format requested by the prompt.

## Tool Usage

- To list image files, call `list` with the target directory and image extensions such as `.png`, `.jpg`, `.jpeg`, and `.svg`.
- To find a specific design or source file, call `list` with the target directory and an extension such as `.ai`.
- After finding a file, call `read` with the directory and the relative path returned by `list`.
- To open an audio file, call `bash` with the target directory and a command such as `Start-Process -FilePath .\\sofra-dramatic-and-playful-188831.mp3`.
