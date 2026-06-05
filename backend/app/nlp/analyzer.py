"""
NLP Pipeline - Independent from Groq
Uses: NLTK, spaCy, language-tool-python
Analyzes: Grammar, Fluency, Confidence, Vocabulary, Fillers
"""
import re
import math
from typing import Dict, List, Tuple


# Filler words to detect
FILLER_WORDS = [
    "um", "uh", "hmm", "like", "you know", "basically", "actually",
    "kind of", "sort of", "i mean", "right", "okay", "so", "well",
    "literally", "honestly", "obviously"
]


def detect_filler_words(text: str) -> Dict[str, int]:
    """Detect and count filler words in transcript."""
    text_lower = text.lower()
    filler_counts = {}

    for filler in FILLER_WORDS:
        # Use word boundary for single words
        if " " in filler:
            count = text_lower.count(filler)
        else:
            pattern = r'\b' + re.escape(filler) + r'\b'
            count = len(re.findall(pattern, text_lower))

        if count > 0:
            filler_counts[filler] = count

    return filler_counts


def calculate_vocabulary_diversity(text: str) -> float:
    """
    Calculate Type-Token Ratio (TTR) for vocabulary diversity.
    TTR = unique_words / total_words
    Score is normalized 0-100 and scaled by word count.
    """
    if not text.strip():
        return 0.0

    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    if len(words) == 0:
        return 0.0

    unique_words = set(words)
    ttr = len(unique_words) / len(words)

    # Normalize: TTR of 0.7+ is excellent, 0.3 is poor
    normalized = min(100.0, (ttr / 0.7) * 100)
    
    # Scale based on word count to prevent artificially high diversity scores on short responses
    length_factor = min(1.0, len(words) / 50.0)
    return round(normalized * length_factor, 2)


def analyze_sentence_structure(text: str) -> Dict:
    """
    Analyze sentence structure and fluency indicators.
    Uses basic NLTK-style analysis without requiring heavy models.
    """
    sentences = re.split(r'[.!?]+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return {"sentence_count": 0, "avg_length": 0, "short_sentences": 0}

    word_counts = [len(s.split()) for s in sentences]
    avg_length = sum(word_counts) / len(word_counts)
    short_sentences = sum(1 for wc in word_counts if wc < 5)

    return {
        "sentence_count": len(sentences),
        "avg_length": round(avg_length, 1),
        "short_sentences": short_sentences,
    }


def check_grammar_basic(text: str) -> Dict:
    """
    Basic grammar checks without language-tool for fast processing.
    language-tool is used separately for detailed checks.
    """
    errors = []
    text_lower = text.lower()
    words = text.split()

    # Check for repeated words
    repeated = []
    for i in range(len(words) - 1):
        if words[i].lower() == words[i + 1].lower():
            repeated.append(words[i])

    if repeated:
        errors.append(f"Repeated words detected: {', '.join(set(repeated))}")

    # Check for very short responses
    if len(words) < 10:
        errors.append("Response is very brief")

    return {
        "basic_errors": errors,
        "word_count": len(words),
        "repeated_words": list(set(repeated)),
    }


def analyze_confidence_markers(text: str) -> Dict:
    """
    Analyze confidence in speech.
    Low confidence: lots of fillers, hedging language, question tone.
    High confidence: assertive statements, clear structure.
    """
    text_lower = text.lower()

    # Hedging phrases reduce confidence score
    hedging_phrases = [
        "i think", "i guess", "maybe", "probably", "i'm not sure",
        "i believe", "sort of", "kind of", "i suppose", "perhaps",
        "it might be", "it could be"
    ]

    hedge_count = sum(1 for phrase in hedging_phrases if phrase in text_lower)
    filler_data = detect_filler_words(text)
    total_fillers = sum(filler_data.values())

    # Assertive phrases increase confidence
    assertive_phrases = [
        "definitely", "certainly", "clearly", "specifically", "the reason is",
        "this means", "therefore", "as a result", "in summary"
    ]
    assertive_count = sum(1 for phrase in assertive_phrases if phrase in text_lower)

    return {
        "hedge_count": hedge_count,
        "filler_count": total_fillers,
        "filler_words": filler_data,
        "assertive_count": assertive_count,
    }


STOP_WORDS = [
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
    "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers",
    "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
]


def analyze_stop_words(text: str) -> Dict:
    """Analyze stop words in the transcript."""
    text_lower = text.lower()
    words = re.findall(r'\b[a-zA-Z]+\b', text_lower)
    total_words = len(words)

    stop_word_counts = {}
    for word in words:
        if word in STOP_WORDS:
            stop_word_counts[word] = stop_word_counts.get(word, 0) + 1

    total_stop_words = sum(stop_word_counts.values())
    ratio = total_stop_words / max(total_words, 1)

    return {
        "stop_word_count": total_stop_words,
        "stop_word_ratio": round(ratio, 3),
        "stop_words_used": stop_word_counts,
    }


def run_nlp_analysis(transcript: str) -> Dict:
    """
    Main NLP analysis function.
    Returns all NLP metrics for ML scoring.
    """
    if not transcript or not transcript.strip():
        return {
            "filler_words": {},
            "filler_count": 0,
            "vocab_diversity": 0.0,
            "sentence_analysis": {},
            "grammar_analysis": {},
            "confidence_markers": {},
            "word_count": 0,
            "stop_word_count": 0,
            "stop_word_analysis": {
                "stop_word_count": 0,
                "stop_word_ratio": 0.0,
                "stop_words_used": {}
            }
        }

    filler_data = detect_filler_words(transcript)
    vocab_diversity = calculate_vocabulary_diversity(transcript)
    sentence_analysis = analyze_sentence_structure(transcript)
    grammar_analysis = check_grammar_basic(transcript)
    confidence_markers = analyze_confidence_markers(transcript)
    stop_word_data = analyze_stop_words(transcript)

    return {
        "filler_words": filler_data,
        "filler_count": sum(filler_data.values()),
        "vocab_diversity": vocab_diversity,
        "sentence_analysis": sentence_analysis,
        "grammar_analysis": grammar_analysis,
        "confidence_markers": confidence_markers,
        "word_count": len(transcript.split()),
        "stop_word_count": stop_word_data["stop_word_count"],
        "stop_word_analysis": stop_word_data,
        "transcript": transcript,
    }


def run_language_tool_check(transcript: str) -> Dict:
    """
    Run language-tool-python for detailed grammar checking.
    Falls back gracefully if tool is not available.
    """
    try:
        import language_tool_python
        tool = language_tool_python.LanguageTool('en-US')
        matches = tool.check(transcript)

        error_count = len(matches)
        error_details = [
            {
                "message": m.message,
                "category": m.category,
                "offset": m.offset,
            }
            for m in matches[:10]  # Cap at 10 errors
        ]

        tool.close()
        return {
            "error_count": error_count,
            "errors": error_details,
            "tool_available": True,
        }
    except Exception as e:
        # Graceful fallback
        return {
            "error_count": 0,
            "errors": [],
            "tool_available": False,
            "error": str(e),
        }
