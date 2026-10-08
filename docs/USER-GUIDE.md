# Doodle Alive: User Guide

Draw on paper, photograph it with a phone, and the drawing comes to life as a GIF or video.

This guide covers every feature and how to use it, for the team running the workshop and for anyone trying the app. For setup, deployment and code, see [HANDOFF.md](HANDOFF.md) and the [README](../README.md).

**App:** https://doodlealive6c8d31.z23.web.core.windows.net
**Admin panel:** the same address with `#admin` at the end

_Last updated: 2026-10-08 (new React app)_

---

## 1. Quick start (30 seconds)

1. Draw a **person** with a head, body, two arms and two legs. Use a thick dark marker on white paper.
2. Open the app on your phone and **Live camera** or **Take photo**.
3. Tap **Continue**, leave **A person / figure** selected and tap **Make it move!**
4. After about a minute your drawing dances. Tap **Save** to keep it.

---

## 2. What can it animate?

Pick what you drew under **Your drawing is…** (step 2, Motion)

| Option | Made by | What you get | Time | Daily limit? |
|---|---|---|---|---|
| **A person / figure** (default) | Meta AnimatedDrawings, on our own server | The drawing itself dances (GIF) | ~1 min | **No limit** |
| **An animal on 4 legs** | Meta AnimatedDrawings (four-legged walk) | The animal walks (GIF) | ~1 min | **No limit** |
| **Let AI decide** | Gemini looks at the drawing and picks one of the other three | depends on the pick | | |
| **Anything else** | AI video (LTX-Video) | A short video of anything: rocket, cat, house… | 15 s–3 min | **Yes** (see §6) |

**What figures can do:** a person can only play 5 recorded moves: **wave, jump, jumping jacks, zombie walk, dab**.
- Your words pick the move. "waves hello" plays **wave**.
- If your words name no move, the AI picks the closest one. "running" gets the **zombie walk**, because it's the only walking move.
- For any other motion, like a real run, use **Anything else**.

**Animals** have one move: a four-legged walk. Draw the animal from the side with four clear legs.

If a person or animal can't be found in the drawing, the app makes an AI video instead. If that isn't available either, you get a simple offline wobble animation. You always get something, and the flow chart (§5) explains what happened.

---

## 3. Taking the photo

### Take photo / Pick photo / Draw now
**Take photo** opens the phone camera, **Pick photo** picks a photo you already took, and **Draw now** opens a sketchpad to draw with a finger or stylus (colours, brush sizes, eraser, undo).

### Live camera (recommended)
- A dashed frame appears: **fit the paper inside it and hold still**.
- After about 1.5 seconds of holding still, it counts down and **snaps by itself**. You can also tap **Snap now**.
- If it says "A bit more light, please 💡", move closer to a light.
- The app then finds the sheet, straightens it if it was photographed at an angle, and removes shadows. The flow chart shows `paper: found, straightened and whitened`.

**Tips for good results:** use a thick dark marker, white paper and good light, keep the whole sheet in the photo, and avoid a white table, because the paper's edges need to be visible.

### Add a second drawing
After the first photo, tap **Add a second drawing** (or its pencil to draw it), for example a dog on one sheet and a ball on another. The two drawings are put side by side, and the AI makes **one video where they meet**, for example the dog runs over and catches the ball. Two drawings always become an AI video (**Anything else**). Tap its **✕** to remove it.

### Colour it in first
Turn on this switch under **Extras** (step 2) to fill every **closed shape** of the drawing with bright crayon colours before animating. The lines stay exactly as drawn. It works best when shapes are fully closed, with no gaps in the outline. It runs on our server with no AI and no limits.

---

## 4. Telling it how to move

### Or describe it (optional)
Tap a quick idea (the 5 dance moves for a person, motion ideas for anything else), or type an idea, for example "the rocket blasts off into space" or "waves hello".
- **AI video:** Gemini **enriches** your idea into a detailed prompt, because video models follow detailed prompts much better. It keeps exactly the motion you asked for.
- **Person:** your words pick the move (see §2).
- **Leave it empty**, and Gemini invents a motion that fits the drawing.

### Video length
For AI video only: a slider from **2 to 10 seconds**, default 3. Longer videos take longer to make and use more of the daily limit. It's hidden for people and animals, because their moves have a fixed length.

### Check prompt first
Use this to review and change the prompt **before** making the animation, which also saves the daily AI-video limit. The **Check the prompt** panel shows what the AI thinks you drew, and either the dance move or "AI video". Then you can:

| Action | What it does |
|---|---|
| **Edit the text** | Change the prompt directly. |
| **Add or change → Apply** | Type a change such as "the ball rolls on the ground". Gemini rewrites the prompt with it and keeps the rest. |
| **Different idea** | Gemini writes a fresh take with different wording. |
| **Make it move!** | Animates exactly the text in the box. |
| **←** | Returns to the options. |

**Make it move!** on the options screen skips this step and goes straight to animating.

### Edit prompt & remake
After a result, this reopens the **Check the prompt** panel with the same photo and the prompt that was used, so you can tweak it and try again.

---

## 5. While it works, and the result

### 🤔 Guess my drawing (game)
While the animation is being made, the AI shows **3 guesses** of what you drew. Tap the right one, or **Something else**:
- 🎉 "The AI got it on the first try!" / 👍 "The AI got it, eventually."
- 😜 "You fooled the AI!"

The score (AI vs You) is kept on each phone. It's a good game for the room: who can fool the AI?

### "How it was made" flow chart
Under the result, every step appears as a box. Green means done, red means failed, the pulsing orange box is running, and grey boxes are still to come. Each box shows the model used, what it decided and how long it took:

| Step | Shows |
|---|---|
| 📷 Clean up photo | size, `paper: found…`, fixes |
| 🧩 Combine the two drawings | only with a second drawing |
| 🎨 Colour it in | number of shapes filled |
| 🧠 Understand the drawing | what Gemini thinks it is, the 3 guesses, your idea, the enriched prompt, the sound |
| 🔀 Pick the animator | mode and why, the model, the final prompt, the dance move and why, the length |
| 🎬 Animate | which model or server made it, any key switching or fallback, with the reason |
| ✅ Ready | GIF or MP4 and file size |

It's made for presenting: talk the audience through the boxes while a video is being made.

### 🔊 Sound
The result plays a **sound effect** (whoosh, boing, sparkle, splash, roar or beep) and **background music** in a mood the AI picked (happy, calm, spooky or epic). It's all made in the browser, so nothing downloads. Tap **Sound on / Sound off** to toggle. On iPhone, also check that the silent switch is off.

### Save / Share / Compare / New drawing
**Save** downloads or opens the GIF or MP4; on a phone you can also long-press it to save. **Share** opens the phone's share sheet (it needs HTTPS, so it shows on the Azure site but not on a `http://<laptop-ip>` address). **Compare** shows a slider between the original drawing and the animation. **New drawing** resets everything.

### Library and language
Every result is kept in **Library** (bottom bar) on that phone, to watch again, save or delete. The **VI / EN** switch at the top changes the language; the AI's own texts (guesses, flow chart) stay in English.

---

## 6. The AI-video daily limit (for "Anything else")

AI videos run on free GPUs, which have a daily allowance. The app tries them in this order and moves on automatically:

1. **Hugging Face keys**, one per teammate (`HF_TOKENS`). Each free key makes roughly 2–3 videos a day.
2. **Kaggle / Colab GPU**, our own free notebook server, after all keys are used up.
3. **Offline wobble**, if everything else is unavailable.

The flow chart shows which one made each video, for example "Key PA is out of free GPU quota, trying the next key", then "Kaggle GPU (free) · LTX-Video".

**People and animals never use this limit.** For workshop rehearsals, practise with figures.

---

## 7. Admin panel (team only)

Open the app with **`#admin`** at the end of the address and enter the **PIN**, which is `ADMIN_PIN` in `backend/.env`. Share it only with the team.

### Hugging Face keys
- **Shows:** each key's status: **in use**, "Out of quota at 10:42" or "Last worked 10:50".
- **Use:** switches to that key right away.
- **Adding keys:** add them to `HF_TOKENS=Name:hf_…,Name:hf_…` in `backend/.env`, then run `.\scripts\deploy-azure.ps1 -Part backend`.

### Free GPU servers (Kaggle / Colab)
Paste the `https://….gradio.live` link from the notebook and tap **Save**. The link changes every time the notebook restarts, so paste the new one each time; no redeploy is needed.

**Starting the Kaggle server:**
1. On kaggle.com (phone-verified account): **Create → New Notebook → File → Import Notebook**, then upload `notebooks/ltx_gpu_server.ipynb`.
2. **Settings:** Accelerator **GPU T4 x2**, Internet **On**.
3. **Run All.** The last cell prints the link. To keep it running for up to 12 hours with the tab closed, use **Save Version → Save & Run All (Commit)** and copy the link from the version's **Logs**.
4. Paste the link in the admin panel under **Kaggle**. Start it on the morning of the workshop; it uses Kaggle's ~30 free GPU hours a week while it runs.

---

## 8. Workshop checklist

**The day before:**
- [ ] Try every mode once on a real phone: person, animal, anything else, two drawings, colour it in.
- [ ] Collect HF keys from all teammates and redeploy the backend.
- [ ] Prepare a backup: 2–3 good results saved in advance, in case the AI-video limit runs out on stage.

**On the morning:**
- [ ] Start the Kaggle notebook (Commit mode) and paste its link in `#admin`.
- [ ] Open `#admin` and check that the keys show "in use" or "Not used yet", not out of quota.
- [ ] Do one figure and one scene end to end on the workshop Wi-Fi.

**Demo flow (about 3 minutes):**
1. A volunteer draws a stick person and uses **Live camera**. It snaps by itself.
2. While it renders, play **🤔 Guess my drawing** with the room, then walk through the **flow chart**.
3. The figure dances, with **🔊 sound**.
4. A rocket or animal next: use **Check prompt first**, apply a change from the audience ("make it do a loop"), then **Make it move!**
5. Finish with **two drawings** that meet in one video.

---

## 9. Troubleshooting

| Problem | What to do |
|---|---|
| Live camera won't open or is missing | It needs HTTPS (the Azure site) or localhost. Allow camera access in the browser. Otherwise use **Take photo**; it works the same. |
| "paper: edges not found" | Fine, the whole photo is used. For better results, put the paper on a darker table and keep all four corners in view. |
| The figure didn't dance and a video appeared instead | The drawing wasn't recognised as a person. Draw a clear head, body, 2 arms and 2 legs with a thick marker. The red "Animate" box says why. |
| It danced but not the move I asked for | Only 5 moves exist (§2). Use one of the words wave, jump, jumping jacks, zombie or dab, or pick **Anything else** for free motion. |
| The video barely follows my prompt | Describe the motion more concretely, or use **Check prompt first** and **Apply** a clearer change. |
| A yellow warning and an offline wobble | All AI-video options are used up or down. Check `#admin`: switch the key, paste a fresh Kaggle link, or use figures for now. |
| "Colour it in" filled nothing | The shapes have gaps; close the outlines with the marker. |
| No sound | Tap **Sound on**, raise the volume, and on iPhone turn off the silent switch. |
| A Gemini note ("rate limit", "busy") | Too many requests in a minute on the free tier. Wait a moment; the app keeps working with your words as typed. |
| The page looks old after an update | Refresh the page, because phones cache it. |
