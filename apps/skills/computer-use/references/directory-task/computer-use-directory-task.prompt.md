---
id: computer-use-directory-task
name: Computer Use Directory Task
description: Prompts the model to inspect a directory with computer-use tools.
variables:
  - name: targetDirectory
    required: true
  - name: expectedImages
    required: true
  - name: expectedAiFile
    required: true
  - name: expectedAudio
    required: true
metadata:
  source: computer-use-prompt
  scope: directory-task
---

Use the computer-use skill to work only inside {{targetDirectory}}.
First use `list` to list every image file recursively with image extensions.
Then use `list` again to find the .ai design/source file.
Then use `read` on the discovered .ai file to confirm it exists.
Then use `bash` to open {{expectedAudio}} from {{targetDirectory}}.
After all tool work is done, respond exactly in this format:
IMAGES={{expectedImages}}
AI_FILE={{expectedAiFile}}
AUDIO_PLAYED={{expectedAudio}}
