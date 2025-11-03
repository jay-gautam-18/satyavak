<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/11wcI9y99k8MW6KGH7qK8J1pOW-1YzPGI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env` file (or `.env.local`) in the project root and set your Gemini API key using the Vite prefix shown below, or copy from the included `.env.example`:

   - For frontend (Vite):
     `VITE_GEMINI_API_KEY=your_gemini_api_key_here`

   - For server-side usage (optional):
     `GEMINI_API_KEY=your_gemini_api_key_here`

3. Run the app:
   `npm run dev`
