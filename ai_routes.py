"""
ai_routes.py
─────────────────────────────────────────────────────────────────
StudyHub · AI Blueprint
All /api/ai/* endpoints.  Register once in app.py:

    from ai_routes import ai_bp
    app.register_blueprint(ai_bp)

Environment variables required (put in your .env):
    GEMINI_API_KEY=<your key>
    GEMINI_MODEL=gemini-2.0-flash      # optional, this is the default
─────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import logging
import os

from flask import Blueprint, jsonify, request

from gemini_service import GeminiService

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

# ── Allowed upload extensions ─────────────────────────────────
ALLOWED_EXT = {"pdf", "pptx", "ppt"}

# ── Max file size: 20 MB ──────────────────────────────────────
MAX_FILE_BYTES = 20 * 1024 * 1024

# ── Models to try in order if primary is rate-limited ─────────
FALLBACK_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
]


# ══════════════════════════════════════════════════════════════
# Service factory — NO cache so .env changes take effect
# ══════════════════════════════════════════════════════════════

def _get_service() -> GeminiService | None:
    """Create a fresh GeminiService on every call (reads .env each time)."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    if not api_key:
        logger.error("GEMINI_API_KEY is not set.")
        return None
    try:
        return GeminiService(api_key=api_key, model=model)
    except Exception as exc:
        logger.error("Failed to initialise GeminiService: %s", exc)
        return None


def _get_service_with_fallback() -> tuple[GeminiService | None, str]:
    """
    Try the configured model first, then fall back through FALLBACK_MODELS.
    Returns (service, model_name_used).
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.error("GEMINI_API_KEY is not set.")
        return None, ""

    primary = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()

    # Build list: primary first, then fallbacks (no duplicates)
    models_to_try = [primary] + [m for m in FALLBACK_MODELS if m != primary]

    for model in models_to_try:
        try:
            svc = GeminiService(api_key=api_key, model=model)
            logger.info("Using model: %s", model)
            return svc, model
        except Exception as exc:
            logger.warning("Model %s failed to init: %s", model, exc)
            continue

    return None, ""


def _service_or_error():
    """Return (service, None) or (None, error_response)."""
    svc = _get_service()
    if svc is None:
        return None, (
            jsonify({"error": "AI service unavailable. Check GEMINI_API_KEY in .env."}),
            503,
        )
    return svc, None


# ══════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════

def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXT


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _try_generate(svc, method_name, **kwargs):
    """
    Call a GeminiService method. If it gets a 429 rate-limit error,
    automatically retry with the next available fallback model.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    primary = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    models_to_try = [primary] + [m for m in FALLBACK_MODELS if m != primary]

    last_result = None
    for model in models_to_try:
        try:
            current_svc = GeminiService(api_key=api_key, model=model)
            method = getattr(current_svc, method_name)
            result = method(**kwargs)

            # If it's a 429 / quota error, try next model
            if not result.success and result.error and (
                "429" in result.error or
                "RESOURCE_EXHAUSTED" in result.error or
                "quota" in result.error.lower()
            ):
                logger.warning("Model %s quota exceeded, trying next...", model)
                last_result = result
                continue

            return result  # success or non-quota error — return immediately

        except Exception as exc:
            logger.warning("Model %s raised exception: %s", model, exc)
            last_result = None
            continue

    # All models exhausted
    if last_result:
        return last_result
    from gemini_service import AIResult
    return AIResult(
        success=False,
        error="All Gemini models are currently rate-limited. Please wait a few minutes and try again."
    )


# ══════════════════════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════════════════════

# ── 1. Generate from raw text ──────────────────────────────────

@ai_bp.route("/generate", methods=["POST"])
def generate():
    """
    POST /api/ai/generate
    Body (JSON):
        text       str   — Extracted document text.
        gen_type   str   — "flashcard" | "quiz" | "reviewer"
        quiz_type  str   — "mcq" | "truefalse" | "identification" | "mixed"
        count      int   — Number of items (5-50, default 10)
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "AI service unavailable. Check GEMINI_API_KEY in .env."}), 503

    body = request.get_json(silent=True) or {}

    text      = (body.get("text") or "").strip()
    gen_type  = (body.get("gen_type") or "flashcard").strip().lower()
    quiz_type = (body.get("quiz_type") or "mcq").strip().lower()
    count     = _clamp(int(body.get("count") or 10), 3, 50)

    if not text:
        return jsonify({"error": "No text provided."}), 400

    result = _try_generate(
        None, "generate_from_text",
        text=text, gen_type=gen_type, quiz_type=quiz_type, count=count
    )

    if not result.success:
        return jsonify({"error": result.error}), 422

    return jsonify({
        "items":         result.items,
        "raw":           result.raw,
        "used_fallback": result.used_fallback,
        "note":          result.note,
        "metadata":      result.metadata,
    })


# ── 2. Generate from uploaded file ────────────────────────────

@ai_bp.route("/generate-file", methods=["POST"])
def generate_from_file():
    """
    POST /api/ai/generate-file
    Form fields:
        file       file  — PDF or PPTX binary
        gen_type   str   — "flashcard" | "quiz" | "reviewer"
        quiz_type  str   — "mcq" | "truefalse" | "identification" | "mixed"
        count      int   — Number of items
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "AI service unavailable. Check GEMINI_API_KEY in .env."}), 503

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    f = request.files["file"]
    if not f.filename or not _allowed(f.filename):
        return jsonify({"error": "Only .pdf, .pptx, .ppt files are accepted."}), 415

    file_bytes = f.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        return jsonify({"error": "File exceeds the 20 MB limit."}), 413

    gen_type  = (request.form.get("gen_type")  or "flashcard").strip().lower()
    quiz_type = (request.form.get("quiz_type") or "mcq").strip().lower()
    count     = _clamp(int(request.form.get("count") or 10), 3, 50)

    result = _try_generate(
        None, "generate_from_file",
        file_bytes=file_bytes, filename=f.filename,
        gen_type=gen_type, quiz_type=quiz_type, count=count
    )

    if not result.success:
        return jsonify({"error": result.error}), 422

    return jsonify({
        "items":         result.items,
        "raw":           result.raw,
        "used_fallback": result.used_fallback,
        "note":          result.note,
        "metadata":      result.metadata,
    })


# ── 3. Extract text only ──────────────────────────────────────

@ai_bp.route("/extract-text", methods=["POST"])
def extract_text():
    svc, err = _service_or_error()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    f = request.files["file"]
    if not f.filename or not _allowed(f.filename):
        return jsonify({"error": "Only .pdf, .pptx, .ppt files are accepted."}), 415

    file_bytes = f.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        return jsonify({"error": "File exceeds the 20 MB limit."}), 413

    try:
        text = svc.extract_text_from_file(file_bytes, f.filename)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 422

    return jsonify({"text": text, "char_count": len(text)})


# ── 4. Flashcards only ────────────────────────────────────────

@ai_bp.route("/flashcards", methods=["POST"])
def generate_flashcards():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "AI service unavailable."}), 503

    body  = request.get_json(silent=True) or {}
    text  = (body.get("text") or "").strip()
    count = _clamp(int(body.get("count") or 10), 3, 50)

    if not text:
        return jsonify({"error": "No text provided."}), 400

    result = _try_generate(None, "generate_flashcards", text=text, count=count)

    if not result.success:
        return jsonify({"error": result.error}), 422

    return jsonify({
        "items":    result.items,
        "raw":      result.raw,
        "metadata": result.metadata,
    })


# ── 5. Quiz only ──────────────────────────────────────────────

@ai_bp.route("/quiz", methods=["POST"])
def generate_quiz():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "AI service unavailable."}), 503

    body      = request.get_json(silent=True) or {}
    text      = (body.get("text") or "").strip()
    quiz_type = (body.get("quiz_type") or "mcq").strip().lower()
    count     = _clamp(int(body.get("count") or 10), 3, 50)

    if not text:
        return jsonify({"error": "No text provided."}), 400

    result = _try_generate(None, "generate_quiz", text=text, quiz_type=quiz_type, count=count)

    if not result.success:
        return jsonify({"error": result.error}), 422

    return jsonify({
        "items":    result.items,
        "raw":      result.raw,
        "metadata": result.metadata,
    })


# ── 6. Reviewer / study guide ─────────────────────────────────

@ai_bp.route("/reviewer", methods=["POST"])
def generate_reviewer():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "AI service unavailable."}), 503

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()

    if not text:
        return jsonify({"error": "No text provided."}), 400

    result = _try_generate(None, "generate_reviewer", text=text)

    if not result.success:
        return jsonify({"error": result.error}), 422

    reviewer = result.items[0] if result.items else {}
    return jsonify({
        "reviewer": reviewer,
        "raw":      result.raw,
    })


# ── 7. Health check ───────────────────────────────────────────

@ai_bp.route("/health", methods=["GET"])
def health():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    ready   = bool(api_key)
    return jsonify({
        "ready":           ready,
        "model":           model,
        "fallback_models": FALLBACK_MODELS,
        "status":          "ok" if ready else "missing GEMINI_API_KEY",
    })
