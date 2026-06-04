"""
ML Pipeline - Scikit-Learn based Communication Scoring
Completely independent from Groq.
Converts NLP features into scores using rule-based + ML approach.
"""
import math
from typing import Dict


def compute_grammar_score(nlp_data: Dict, lt_data: Dict) -> float:
    """
    Grammar score based on:
    - Language tool error count
    - Basic grammar errors
    - Sentence structure
    - Word count (too short = penalized)
    """
    word_count = nlp_data.get("word_count", 0)
    if word_count == 0:
        return 0.0
    if word_count < 5:
        return 20.0

    # Base score starts at 100
    score = 100.0

    # Deduct for language tool errors
    lt_errors = lt_data.get("error_count", 0)
    score -= min(40, lt_errors * 5)  # Max 40 points deduction

    # Deduct for repeated words
    repeated = len(nlp_data.get("grammar_analysis", {}).get("repeated_words", []))
    score -= min(15, repeated * 5)

    # Deduct for very short response
    if word_count < 20:
        score -= 20
    elif word_count < 40:
        score -= 10

    return max(10.0, round(score, 1))


def compute_fluency_score(nlp_data: Dict) -> float:
    """
    Fluency score based on:
    - Sentence count and length
    - Vocabulary diversity
    - Absence of excessive fillers
    """
    word_count = nlp_data.get("word_count", 0)
    if word_count == 0:
        return 0.0
    if word_count < 5:
        return 20.0

    score = 100.0
    sentence_data = nlp_data.get("sentence_analysis", {})
    vocab_diversity = nlp_data.get("vocab_diversity", 50.0)
    filler_count = nlp_data.get("filler_count", 0)

    # Reward good sentence structure
    avg_len = sentence_data.get("avg_length", 0)
    if avg_len < 5:
        score -= 25  # Very short sentences
    elif avg_len > 30:
        score -= 10  # Very long sentences

    # Vocabulary diversity contribution
    vocab_contribution = (vocab_diversity / 100) * 30
    score = (score * 0.70) + vocab_contribution

    # Filler word penalty
    filler_ratio = filler_count / max(word_count, 1)
    if filler_ratio > 0.15:
        score -= 30
    elif filler_ratio > 0.08:
        score -= 15
    elif filler_ratio > 0.04:
        score -= 5

    return max(10.0, round(score, 1))


def compute_confidence_score(nlp_data: Dict) -> float:
    """
    Confidence score based on:
    - Filler words
    - Hedging language
    - Assertive language
    - Response length
    """
    word_count = nlp_data.get("word_count", 0)
    if word_count == 0:
        return 0.0
    if word_count < 5:
        return 20.0

    score = 100.0
    confidence_data = nlp_data.get("confidence_markers", {})
    filler_count = confidence_data.get("filler_count", 0)
    hedge_count = confidence_data.get("hedge_count", 0)
    assertive_count = confidence_data.get("assertive_count", 0)

    # Filler penalty
    score -= min(30, filler_count * 4)

    # Hedging penalty
    score -= min(25, hedge_count * 6)

    # Assertive bonus
    score += min(15, assertive_count * 4)

    # Very short answers show low confidence
    if word_count < 30:
        score -= 15

    return max(10.0, round(min(score, 100.0), 1))


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


def compute_all_communication_scores(nlp_data: Dict, lt_data: Dict) -> Dict:
    """
    Main ML scoring function.
    Takes NLP analysis output and returns all communication scores.
    """
    grammar_score = compute_grammar_score(nlp_data, lt_data)
    fluency_score = compute_fluency_score(nlp_data)
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
