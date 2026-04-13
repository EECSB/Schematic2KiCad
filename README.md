# Schematic2KiCad

![Schematic2KiCad app image](https://eecs.blog/wp-content/uploads/2026/04/Schematic2KiCad.png)
<br>
![Schematic2KiCad upload](https://eecs.blog/wp-content/uploads/2026/04/Schematic2KiCad-example-upload-1.png)
![Schematic2KiCad upload processed](https://eecs.blog/wp-content/uploads/2026/04/Schematic2KiCad-example-processed-1.png)
<br>
Close enough, I guess...
![Schematic2KiCad kicad schematic import](https://eecs.blog/wp-content/uploads/2026/04/Schematic2KiCad-example-1-import.png)

<br>

## About
<div>
   This app uses AI to automatically extract components and connections from hand-drawn or printed schematic images, giving you the BOM and allowing you to export the schematic directly to .kicad_sch format.
   As expected, with AI "vibe coded" apps, it's kinda flakey. You will not get a deterministic result. So if you upload the same image twice, it might give you the correct schematic once and a wrong one the next time(or wrong both times).
</div>

<br>
<br>

## Try it out
You can try it out [here](https://schematic2kicad-843674838026.us-west1.run.app/).

<br>
<br>

# Stuff added by Google AI Studio

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/65646772-4047-45e0-a8ca-fa11d9ebba8c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
