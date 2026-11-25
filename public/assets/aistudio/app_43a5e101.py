"""
Scam Alert and Pashto Translator - Backend Server
===================================================
This is the main Flask application that:
1. Serves the frontend HTML page
2. Accepts suspicious messages via POST /analyze
3. Sends them to Qwen AI for scam detection + Pashto translation
4. Returns structured JSON results to the frontend

Author: Built for educational purposes
"""

import os
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI

# ============================================
# SETUP: Load environment variables from .env
# ============================================
load_dotenv()

# Read configuration from environment variables
QWEN_API_KEY = os.getenv("QWEN_API_KEY")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-plus")
QWEN_BASE_URL = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")

# ============================================
# Initialize Flask app
# ============================================
app = Flask(__name__)

# ============================================
# Initialize OpenAI client pointing to DashScope
# (DashScope provides an OpenAI-compatible API)
# ============================================
client = OpenAI(
    api_key=QWEN_API_KEY,
    base_url=QWEN_BASE_URL
)

# ============================================
# SYSTEM PROMPT: Tells Qwen exactly what to do
# ============================================
SYSTEM_PROMPT = """You are a scam detection expert and professional Pashto translator. Your job is to analyze messages for scam indicators and translate them into Pashto.

## SCAM DETECTION RULES
Check the message for these red flags:
- Fake prize/lottery/win notifications asking for fees or personal info
- Requests for money, advance fees, or "processing charges"
- Fake job offers asking for registration fees, ID documents, or bank details
- Suspicious bank or mobile wallet messages (especially with urgent language)
- Requests for OTP, password, PIN, CVV, or any personal/financial information
- Suspicious or shortened URLs/links
- Urgent or threatening language ("act now", "your account will be blocked", "immediate action required")
- Impersonation of banks, government agencies, telecom companies, or trusted organizations
- Poor grammar combined with urgent requests (common in phishing)
- Requests to download apps or click links to "verify" accounts

## IMPORTANT CLASSIFICATION RULES
- NEVER claim a message is 100% safe or 100% a scam
- Classification options:
  * "Likely Scam" - Multiple strong red flags present
  * "Suspicious" - Some concerning elements but not definitive
  * "No Obvious Scam Indicators" - Message appears legitimate but user should still exercise caution
- Risk level: "High", "Medium", or "Low"
- Always provide 2-5 specific reasons for your classification

## PASHTO TRANSLATION RULES
- Translate the message into natural, fluent Pashto using Arabic/Pashto script (پښتو)
- Preserve ALL numbers, phone numbers, dates, monetary amounts, names, and links EXACTLY as they appear
- Keep the original meaning completely - do not add or remove any details
- If the input is already in Pashto, return it as-is (minor grammar corrections are acceptable)
- Use proper Pashto grammar and natural phrasing

## SAFETY ADVICE RULES
- Provide 3 to 5 short, practical safety tips
- Tips should be SPECIFIC to the type of message analyzed
- Provide tips in BOTH English and Pashto
- Common tips include: don't share OTP/passwords, don't send money to strangers, don't click suspicious links, verify through official channels, report to authorities

## OUTPUT FORMAT
You MUST respond with valid JSON only (no markdown, no explanations outside JSON). Use this exact schema:
{
    "classification": "Likely Scam" OR "Suspicious" OR "No Obvious Scam Indicators",
    "risk_level": "High" OR "Medium" OR "Low",
    "reasons": ["reason 1", "reason 2", "reason 3"],
    "pashto_translation": "the full message translated into Pashto script",
    "safety_advice_english": ["tip 1", "tip 2", "tip 3"],
    "safety_advice_pashto": ["tip 1 in Pashto", "tip 2 in Pashto", "tip 3 in Pashto"]
}
"""


# ============================================
# ROUTE: Serve the main page
# ============================================
@app.route("/")
def index():
    """Serve the frontend HTML page."""
    return render_template("index.html")


# ============================================
# ROUTE: Analyze a message for scams
# ============================================
@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Accept a message via POST, send it to Qwen AI for analysis,
    and return the scam detection results + Pashto translation.
    """

    # --- Step 1: Validate the API key is configured ---
    if not QWEN_API_KEY or QWEN_API_KEY == "your_api_key_here":
        return jsonify({
            "error": "API key not configured. Please set QWEN_API_KEY in your .env file."
        }), 500

    # --- Step 2: Get and validate the user's message ---
    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid request. Please send valid JSON."}), 400

    if not data or "message" not in 
        return jsonify({"error": "No message provided. Please enter a message to analyze."}), 400

    user_message = data["message"].strip()

    # Check if message is empty
    if not user_message:
        return jsonify({"error": "Message is empty. Please paste a message to analyze."}), 400

    # Check message length (max 5000 characters)
    if len(user_message) > 5000:
        return jsonify({"error": "Message is too long. Maximum 5000 characters allowed."}), 400

    # --- Step 3: Call Qwen AI for analysis ---
    try:
        response = client.chat.completions.create(
            model=QWEN_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this message:\n\n{user_message}"}
            ],
            temperature=0.2,  # Low temperature for consistent, reliable output
            response_format={"type": "json_object"}  # Force JSON output
        )

        # Extract the AI's response text
        ai_response_text = response.choices[0].message.content

        # --- Step 4: Parse the JSON response ---
        try:
            result = json.loads(ai_response_text)
        except json.JSONDecodeError:
            # If AI returned invalid JSON despite our instructions
            return jsonify({
                "error": "AI returned an invalid response. Please try again."
            }), 502

        # --- Step 5: Validate the response has required fields ---
        required_fields = [
            "classification", "risk_level", "reasons",
            "pashto_translation", "safety_advice_english", "safety_advice_pashto"
        ]
        for field in required_fields:
            if field not in result:
                result[field] = [] if field in ["reasons", "safety_advice_english", "safety_advice_pashto"] else "Unknown"

        # Return the complete result to the frontend
        return jsonify(result)

    except Exception as e:
        # Handle any errors (network issues, bad API key, rate limits, etc.)
        error_message = str(e)

        # Provide user-friendly error messages
        if "Unauthorized" in error_message or "401" in error_message:
            return jsonify({
                "error": "Invalid API key. Please check your QWEN_API_KEY in the .env file."
            }), 401
        elif "rate" in error_message.lower():
            return jsonify({
                "error": "API rate limit exceeded. Please wait a moment and try again."
            }), 429
        else:
            return jsonify({
                "error": f"Failed to analyze message. Please try again. ({error_message[:100]})"
            }), 500


# ============================================
# RUN THE SERVER
# ============================================
if __name__ == "__main__":
    # Run in debug mode for development (auto-reload on code changes)
    print("=" * 50)
    print("🛡️  Scam Alert & Pashto Translator")
    print("=" * 50)
    print(f"📡 Server running at: http://127.0.0.1:5000")
    print(f"🤖 Using model: {QWEN_MODEL}")
    print(f"🔑 API Key configured: {'Yes' if QWEN_API_KEY and QWEN_API_KEY != 'your_api_key_here' else 'No - set QWEN_API_KEY in .env'}")
    print("=" * 50)
    app.run(debug=True, host="127.0.0.1", port=5000)
