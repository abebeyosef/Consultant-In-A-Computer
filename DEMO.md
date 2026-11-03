# Demo walkthrough (draft — finalised in M12)

Use Chrome, 1440×900 or larger. Run `npm run build && npm start` beforehand and open
http://localhost:3000. Check `http://localhost:3000/api/health` says `live` (or `mock` if
you want the guaranteed-offline version: set `MOCK_MODE=1`).

## 1. Sample workshop (main path, ~2 minutes)

1. Start card → **Try a sample workshop**. The Harbourline transcript streams in.
2. Optional: click **1.5×** in the top bar to speed it up.
3. Within ~60 s an amber flag slides into the right rail: *Value vs feasibility matrix*,
   with a one-sentence reason and the quote that triggered it (underlined in amber in
   the transcript — click the quote to scroll to it).
4. **Open board** → the matrix opens pre-filled with the six AI ideas, placed by value
   and feasibility. Items are amber and dashed: they're suggestions.
5. Drag a sticky — it turns solid (accepted). **Keep all** accepts the rest.
   Click a sticky to see the transcript line it came from.
6. **Esc** goes back to the transcript. Two more flags follow: *Stakeholder map*
   (~2:00) and *Build, buy or partner* (~3:00).

## 2. Live microphone

1. Start card → **Start listening** → allow the microphone.
2. Talk through a prioritisation, e.g. "We've got four ideas: … this one is really
   valuable but hard, that one is easy but low value…". Text appears as you speak
   (grey while interim, then ink).
3. Press **M** to mark the last 30 s — it triggers a check immediately. Or click
   **Suggest a framework** at the foot of the rail.

## 3. Paste a transcript (fallback path, ~30 seconds)

1. Start card → **Paste a transcript instead** → paste text (or **Use the sample transcript**).
2. Tick **Process instantly** for an immediate result, or leave it paced to watch flags arrive.
3. Open the flag's board as above.

## 4. Room view (projector)

1. Top bar → **Open room view** (drag that window to the projector), or just click
   **Send to room** on a board — it opens the room window if needed.
2. The room shows a calm holding screen (session name + listening state) until you send.
3. On a board, **Send to room**: the room shows only kept (solid) items — amber AI
   suggestions stay private until you accept them. Pan/zoom on your board and the room follows.
4. **B** blanks the room (again to restore). In Room mode (start-card switch), **J** shows live captions.
5. In the room window, **D** (or the hover button bottom-right) toggles "dim room".

## 5. Sharing

On any board, **Share** → *Copy read-only link* (opens anywhere, no account; kept items
only), *Download PNG*, *Download .excalidraw file*, or *Copy session notes* (Markdown).
After **Stop**, the rail shows a session summary with the same notes button.

## Keyboard shortcuts

| Key | Action |
|---|---|
| Enter | Start (on the start card) |
| M | Mark the last 30 seconds (triggers a check) |
| F | Focus mode (hide transcript, keep the pill and flags) |
| ⌘K or / | Open any framework from the library, pre-filled from the transcript |
| Esc | Deselect on the board, then back to the transcript |
| B | Blank / unblank the room view |
| J | Room captions on/off (Room mode) |
| D | Dim room (in the room window) |

## If something fails

- **Mic doesn't work / not Chrome** → use the sample or paste path; they share the same pipeline.
- **API slow or down** → the app silently falls back to the offline engine ("Offline mode"
  in the rail). The sample workshop has canned fills, so boards are still fully populated.
  To be safe, restart with `MOCK_MODE=1 npm start`.
- **Board didn't fill** → the empty framework opens with ghost labels; click **Re-fill from transcript**.
- **Reloaded by accident** → the session restores (paused); click Resume.
