
# QuizFlash Pro Deployment & API Configuration

This application uses the Google Gemini API to generate interactive quizzes. To deploy and run the app successfully, you must provide one or more valid API keys.

## 1. Setting Up the API Key

The application reads the API Key from an environment variable named `API_KEY`.

### Local Development
If you are running the app locally, you can set the environment variable in your terminal or use a `.env` file (if supported by your builder):
```bash
# Example for Linux/macOS
export API_KEY="your_google_api_key_here"

# Example for Windows (CMD)
set API_KEY="your_google_api_key_here"
```

### Production Deployment (Vercel, Netlify, Cloudflare, etc.)
When deploying to a hosting platform:
1. Go to your project dashboard (e.g., Vercel Project Settings).
2. Navigate to **Environment Variables**.
3. Create a new variable:
   - **Key:** `API_KEY`
   - **Value:** `your_actual_api_key_value`
4. Re-deploy your application.

## 2. Using Multiple API Keys (Failover Support)

If you have multiple Gemini API keys (to bypass quota limits or for reliability), this app supports **automatic failover**.

### How to configure multiple keys:
Provide all your keys as a **comma-separated string** in the `API_KEY` environment variable:
- **Key:** `API_KEY`
- **Value:** `key_1,key_2,key_3,key_4`

### How it works:
1. The app starts using `key_1`.
2. If `key_1` fails (due to a 429 "Quota Exceeded" error or any other issue), the app automatically switches to `key_2`.
3. It continues this process until a request succeeds or all keys fail.

## 3. Important Notes
- **Privacy:** Never commit your API keys to a public Git repository. Always use environment variables.
- **Quota:** Each Gemini API key has specific limits. Using multiple keys is a great way to handle high-traffic usage.
- **Model:** This app defaults to `gemini-3-flash-preview` for high speed and accuracy.

---
*Created by QuizFlash AI Team*
