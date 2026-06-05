"""
ML Pipeline - Scikit-Learn based Communication Scoring
Completely independent from Groq.
Converts NLP features into scores using rule-based + ML approach.
"""
import math
from typing import Dict, Optional


def is_generic_response(transcript: Optional[str], word_count: int) -> bool:
    """
    Identify generic, evasive, or extremely short responses.
    Aligns with the backend evaluation logic.
    """
    if not transcript or not transcript.strip():
        return True
    if word_count < 8:  # Strict minimum word count threshold
        return True

    text_lower = transcript.lower().strip().replace(".", "").replace("!", "").replace("?", "")
    generic_phrases = [
        "i don't know", "i do not know", "i am not sure", "no idea", "not sure",
        "let me think", "i forgot", "pass", "no comment", "don't know", "skip"
    ]
    return any(phrase in text_lower for phrase in generic_phrases)


def compute_grammar_score(nlp_data: Dict, lt_data: Dict) -> float:
    """
    Grammar score based on:
    - Language tool error density
    - Repeated words density
    - Response length (stricter penalty)
    """
    transcript = nlp_data.get("transcript", "")
    word_count = nlp_data.get("word_count", 0)
    
    if is_generic_response(transcript, word_count):
        return 0.0

    score = 100.0

    # Deduct for language tool errors based on density (stricter penalty)
    lt_errors = lt_data.get("error_count", 0)
    if word_count > 0:
        error_density = lt_errors / word_count
        score -= min(60.0, error_density * 500.0)

    # Deduct for repeated words based on density
    repeated_words = nlp_data.get("grammar_analysis", {}).get("repeated_words", [])
    if word_count > 0:
        repeated_density = len(repeated_words) / word_count
        score -= min(20.0, repeated_density * 300.0)

    # Deduct for short response (stricter penalty)
    if word_count < 15:
        score -= 50.0
    elif word_count < 30:
        score -= 30.0
    elif word_count < 50:
        score -= 15.0
    elif word_count < 75:
        score -= 5.0

    return max(0.0, round(score, 1))


def compute_fluency_score(nlp_data: Dict, duration: Optional[float] = None) -> float:
    """
    Fluency score based on:
    - Speaking pace (Words Per Minute)
    - Sentence count and length
    - Vocabulary diversity (scaled by length)
    - Filler word ratio (stricter penalty)
    """
    transcript = nlp_data.get("transcript", "")
    word_count = nlp_data.get("word_count", 0)
    
    if is_generic_response(transcript, word_count):
        return 0.0

    score = 100.0
    sentence_data = nlp_data.get("sentence_analysis", {})
    vocab_diversity = nlp_data.get("vocab_diversity", 50.0)
    filler_count = nlp_data.get("filler_count", 0)

    # 1. Speaking pace (WPM) - Stricter penalty
    if duration and duration > 0:
        wpm = (word_count / duration) * 60.0
        # Standard professional speaking rate is 110-160 WPM
        if wpm < 40:
            score -= 50.0  # Extremely slow (long pauses)
        elif wpm < 70:
            score -= 35.0  # Slow
        elif wpm < 100:
            score -= 15.0  # Slightly slow
        elif wpm > 180:
            score -= 20.0  # Too fast
        elif wpm > 220:
            score -= 40.0  # Extremely fast / rushed

    # 2. Filler word penalty (strictly proportional to ratio, stricter penalty)
    filler_ratio = filler_count / max(word_count, 1)
    if filler_ratio > 0.12:
        score -= 40.0
    elif filler_ratio > 0.06:
        score -= 25.0
    elif filler_ratio > 0.03:
        score -= 15.0
    elif filler_ratio > 0.01:
        score -= 5.0

    # 3. Sentence structure - Stricter avg sentence length checks
    avg_len = sentence_data.get("avg_length", 0)
    if avg_len < 8:
        score -= 25.0  # Very short, choppy sentences
    elif avg_len > 35:
        score -= 15.0  # Extremely long run-on sentences

    # 4. Length penalty - Stricter length penalty
    if word_count < 15:
        score -= 40.0
    elif word_count < 30:
        score -= 20.0
    elif word_count < 50:
        score -= 10.0

    # 5. Vocabulary diversity contribution
    vocab_contribution = (vocab_diversity / 100.0) * 25.0
    score = (score * 0.75) + vocab_contribution

    return max(0.0, round(score, 1))


def compute_confidence_score(nlp_data: Dict) -> float:
    """
    Confidence score based on:
    - Filler words ratio (stricter)
    - Hedging language ratio (stricter)
    - Assertive language (length-scaled)
    - Response length (stricter)
    """
    transcript = nlp_data.get("transcript", "")
    word_count = nlp_data.get("word_count", 0)
    
    if is_generic_response(transcript, word_count):
        return 0.0

    score = 100.0
    confidence_data = nlp_data.get("confidence_markers", {})
    filler_count = confidence_data.get("filler_count", 0)
    hedge_count = confidence_data.get("hedge_count", 0)
    assertive_count = confidence_data.get("assertive_count", 0)

    # 1. Filler word ratio penalty - Stricter
    filler_ratio = filler_count / max(word_count, 1)
    if filler_ratio > 0.12:
        score -= 35.0
    elif filler_ratio > 0.06:
        score -= 20.0
    elif filler_ratio > 0.02:
        score -= 10.0

    # 2. Hedging language ratio penalty - Stricter
    hedge_ratio = hedge_count / max(word_count, 1)
    if hedge_ratio > 0.10:
        score -= 35.0
    elif hedge_ratio > 0.05:
        score -= 20.0
    elif hedge_ratio > 0.01:
        score -= 10.0

    # 3. Assertive bonus (scaled based on length to prevent gaming on short answers)
    length_scale = min(1.0, word_count / 40.0)
    score += min(15.0, assertive_count * 3.0) * length_scale

    # 4. Response length penalty - Stricter
    if word_count < 15:
        score -= 50.0
    elif word_count < 30:
        score -= 30.0
    elif word_count < 50:
        score -= 15.0
    elif word_count < 75:
        score -= 5.0

    return max(0.0, round(min(score, 100.0), 1))


def compute_communication_score(
    grammar_score: float,
    fluency_score: float,
    confidence_score: float,
    vocab_diversity: float
) -> float:
    """
    Overall communication score.
    Weighted average of all communication components.
    """
    # Weights
    w_grammar = 0.30
    w_fluency = 0.30
    w_confidence = 0.25
    w_vocab = 0.15

    score = (
        grammar_score * w_grammar +
        fluency_score * w_fluency +
        confidence_score * w_confidence +
        vocab_diversity * w_vocab
    )

    return round(min(100.0, max(0.0, score)), 1)


def compute_all_communication_scores(
    nlp_data: Dict, 
    lt_data: Dict, 
    duration: Optional[float] = None
) -> Dict:
    """
    Main ML scoring function.
    Takes NLP analysis output and returns all communication scores.
    """
    transcript = nlp_data.get("transcript", "")
    word_count = nlp_data.get("word_count", 0)

    if is_generic_response(transcript, word_count):
        grammar_score = 0.0
        fluency_score = 0.0
        confidence_score = 0.0
        vocab_diversity = 0.0
        communication_score = 0.0
    else:
        grammar_score = compute_grammar_score(nlp_data, lt_data)
        fluency_score = compute_fluency_score(nlp_data, duration)
        confidence_score = compute_confidence_score(nlp_data)
        vocab_diversity = nlp_data.get("vocab_diversity", 50.0)
        communication_score = compute_communication_score(
            grammar_score, fluency_score, confidence_score, vocab_diversity
        )

    filler_words = nlp_data.get("filler_words", {})
    filler_count = nlp_data.get("filler_count", 0)

    # Generate speaking suggestions
    suggestions = generate_speaking_suggestions(
        grammar_score, fluency_score, confidence_score, filler_words
    )

    return {
        "grammar_score": grammar_score,
        "fluency_score": fluency_score,
        "confidence_score": confidence_score,
        "communication_score": communication_score,
        "vocab_diversity": vocab_diversity,
        "filler_count": filler_count,
        "filler_words": filler_words,
        "speaking_suggestions": suggestions,
    }


def generate_speaking_suggestions(
    grammar: float, fluency: float, confidence: float, fillers: Dict
) -> list:
    """Generate actionable feedback based on scores."""
    suggestions = []

    if grammar < 60:
        suggestions.append("Practice forming grammatically correct sentences before speaking")
    elif grammar < 75:
        suggestions.append("Review common grammar patterns to reduce errors")

    if fluency < 60:
        suggestions.append("Work on sentence flow — aim for complete, well-structured sentences")
    elif fluency < 75:
        suggestions.append("Expand your vocabulary to express ideas more fluently")

    if confidence < 60:
        suggestions.append("Practice speaking assertively — reduce hedging words like 'I think' or 'maybe'")
    elif confidence < 75:
        suggestions.append("Reduce filler words by pausing briefly when gathering thoughts")

    top_fillers = sorted(fillers.items(), key=lambda x: x[1], reverse=True)[:3]
    if top_fillers:
        filler_str = ", ".join([f"'{w}'" for w, _ in top_fillers])
        suggestions.append(f"Focus on reducing filler words: {filler_str}")

    if not suggestions:
        suggestions.append("Great communication! Keep practicing to maintain this standard")

    return suggestions
