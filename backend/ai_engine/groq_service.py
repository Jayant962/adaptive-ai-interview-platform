import json
import re
from groq import Groq
from config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

TOPIC_CONTEXT = {
    "DSA": "Data Structures and Algorithms including arrays, linked lists, trees, graphs, sorting, searching, dynamic programming, complexity analysis",
    "DBMS": "Database Management Systems including SQL, normalization, indexing, transactions, ACID properties, joins, stored procedures",
    "OOPs": "Object-Oriented Programming including encapsulation, inheritance, polymorphism, abstraction, design patterns, SOLID principles",
    "Operating Systems": "Operating Systems including process management, memory management, file systems, scheduling algorithms, deadlocks, synchronization",
    "Computer Networks": "Computer Networks including OSI model, TCP/IP, HTTP, DNS, routing protocols, network security, socket programming",
    "HR Interview": "HR and behavioral interview questions including teamwork, leadership, conflict resolution, strengths/weaknesses, career goals",
    "Machine Learning": "Machine Learning including supervised/unsupervised learning, neural networks, model evaluation, feature engineering, overfitting",
    "Python": "Python programming including data types, functions, OOP, decorators, generators, standard library, frameworks",
    "SQL": "SQL including SELECT queries, JOINs, aggregations, subqueries, indexing, query optimization, stored procedures"
}

DIFFICULTY_CONTEXT = {
    "Easy": "basic foundational concepts suitable for beginners",
    "Medium": "intermediate concepts requiring good understanding",
    "Hard": "advanced concepts requiring deep expertise"
}

def generate_first_question(topic: str, difficulty: str) -> str:
    context = TOPIC_CONTEXT.get(topic, topic)
    diff_ctx = DIFFICULTY_CONTEXT.get(difficulty, "intermediate")

    prompt = f"""You are an expert technical interviewer conducting a {topic} interview.
Generate ONE clear interview question about {context} at {diff_ctx} level.
The question MUST be answerable verbally/orally — avoid asking to "write code", "draw a diagram", or "implement" anything.
Focus on explanation, understanding, comparison, or description.
The question should be specific, practical, and test real understanding.
Return ONLY the question text, nothing else."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200
    )
    return response.choices[0].message.content.strip()


def evaluate_answer(question: str, answer: str, topic: str, difficulty: str) -> dict:
    SILENCE_PATTERNS = [
        "", "you", "the", ".", "..", "...", "thank you", "thanks",
        "um", "uh", "hmm", "hm", "ah", "oh", "okay", "ok",
    ]
    stripped = answer.strip().lower() if answer else ""
    is_empty = (
        not answer
        or len(stripped) < 5
        or stripped in SILENCE_PATTERNS
        or all(c in "., \t\n" for c in stripped)
    )

    if is_empty:
        return {
            "grammar_score": 0,
            "fluency_score": 0,
            "confidence_score": 0,
            "conceptual_score": 0,
            "overall_score": 0,
            "ai_feedback": "No answer was detected. Please click 'Start Speaking', speak your answer clearly, then click 'Stop Speaking' before submitting.",
            "strengths": [],
            "weaknesses": ["No answer provided"],
            "suggestions": [
                "Make sure microphone permission is granted in your browser",
                "Speak clearly and at a normal volume",
                "Record your answer before clicking Submit"
            ],
            "answer_quality": "poor"
        }

    word_count = len(answer.strip().split())

    prompt = f"""You are a strict but fair technical interviewer evaluating a spoken answer.

Topic: {topic}
Difficulty: {difficulty}
Question: {question}
Candidate's Answer: {answer}
Word Count: {word_count} words

Score each dimension from 0-100 using these STRICT rubrics:

GRAMMAR SCORE (0-100):
- 0-30: Many grammatical errors, broken sentences, incomprehensible
- 31-50: Frequent errors but meaning is clear
- 51-70: Minor errors, mostly correct grammar
- 71-85: Good grammar with occasional slips
- 86-100: Near-perfect grammar and sentence structure

FLUENCY SCORE (0-100):
- 0-30: Very short (<15 words), incomplete, or incoherent response
- 31-50: Answer exists but choppy, lacks flow, incomplete thoughts
- 51-70: Moderate flow, some disjointed sentences
- 71-85: Flows well, ideas connect logically
- 86-100: Excellent flow, coherent narrative, well-structured

CONFIDENCE SCORE (0-100):
- 0-30: Very vague, lots of "I think maybe", "I'm not sure", guessing
- 31-50: Uncertain tone, hedging most statements
- 51-70: Some uncertainty but mostly assertive
- 71-85: Mostly confident, clear assertions
- 86-100: Very confident, clear, direct, no unnecessary hedging

CONCEPTUAL CORRECTNESS SCORE (0-100):
- 0-30: Wrong or missing key concepts, answer is off-topic
- 31-50: Partially correct but major gaps or misconceptions
- 51-70: Correct basics but missing depth or nuance
- 71-85: Good understanding, covers main points, minor gaps
- 86-100: Excellent depth, accurate, covers edge cases and nuance

Be STRICT — do not give everyone 70-80. Differentiate based on actual answer quality.
A short vague answer should score 30-50. A detailed accurate answer should score 75-90.
The difficulty level ({difficulty}) should influence conceptual scoring — harder questions need deeper answers.

Respond ONLY with valid JSON — no explanation, no markdown, no extra text:
{{
  "grammar_score": <0-100>,
  "fluency_score": <0-100>,
  "confidence_score": <0-100>,
  "conceptual_score": <0-100>,
  "overall_score": <0-100>,
  "ai_feedback": "<2-3 sentences of specific, actionable feedback referencing the actual answer>",
  "strengths": ["<specific strength from the answer>", "<another strength>"],
  "weaknesses": ["<specific weakness>", "<another weakness>"],
  "suggestions": ["<actionable tip>", "<actionable tip>"],
  "answer_quality": "<poor|average|strong>"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=700
    )

    content = response.choices[0].message.content.strip()

    try:
        content = re.sub(r'```json\s*|\s*```', '', content).strip()
        # Extract JSON object if there's extra text
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            content = json_match.group(0)
        result = json.loads(content)

        # Validate all required keys exist and are numbers
        required_scores = ["grammar_score", "fluency_score", "confidence_score", "conceptual_score"]
        for key in required_scores:
            if key not in result or not isinstance(result[key], (int, float)):
                result[key] = 50

        # Always recompute overall from the actual scores
        scores = [result[k] for k in required_scores]
        result["overall_score"] = round(sum(scores) / len(scores), 1)

        # Clamp all scores 0-100
        for key in required_scores + ["overall_score"]:
            result[key] = max(0, min(100, result[key]))

        # Ensure lists
        for key in ["strengths", "weaknesses", "suggestions"]:
            if key not in result or not isinstance(result[key], list):
                result[key] = []

        if "answer_quality" not in result:
            result["answer_quality"] = (
                "strong" if result["overall_score"] >= 70
                else "poor" if result["overall_score"] < 45
                else "average"
            )

        return result

    except (json.JSONDecodeError, Exception):
        # Fallback: estimate scores from answer length/content rather than fixed 60
        words = word_count
        base = min(65, max(25, words * 2))  # scales with answer length
        return {
            "grammar_score":    base,
            "fluency_score":    max(20, base - 5),
            "confidence_score": max(20, base - 10),
            "conceptual_score": max(20, base - 15),
            "overall_score":    round((base + max(20, base-5) + max(20, base-10) + max(20, base-15)) / 4, 1),
            "ai_feedback": "Your answer was received. Focus on being more detailed and specific in your responses.",
            "strengths": ["Attempted the question"],
            "weaknesses": ["Could provide more technical depth", "Could elaborate more on key concepts"],
            "suggestions": ["Study the core concepts for this topic", "Practice answering with 3-5 sentences minimum"],
            "answer_quality": "average" if words > 20 else "poor"
        }


def generate_next_question(
    topic: str,
    difficulty: str,
    previous_question: str,
    previous_answer: str,
    answer_quality: str,
    question_count: int
) -> dict:
    context = TOPIC_CONTEXT.get(topic, topic)

    if answer_quality == "poor":
        adapt = "easier, more fundamental"
        new_difficulty = "Easy"
    elif answer_quality == "strong":
        adapt = "harder, more challenging and in-depth"
        new_difficulty = "Hard" if difficulty != "Hard" else "Hard"
    else:
        adapt = "similar difficulty"
        new_difficulty = difficulty

    is_follow_up = question_count <= 2 and answer_quality != "poor"

    if is_follow_up:
        prompt = f"""You are an expert {topic} interviewer.

Previous Question: {previous_question}
Candidate's Answer: {previous_answer}
Answer Quality: {answer_quality}

Generate ONE follow-up question that digs deeper into the candidate's answer or explores a related aspect they mentioned.
The follow-up should be {adapt} and build naturally on their response.
The question MUST be answerable verbally — do NOT ask to write code, draw diagrams, or implement anything.
Return ONLY the question text, nothing else."""
    else:
        prompt = f"""You are an expert {topic} interviewer.

Topic Context: {context}
Previous Question: {previous_question}
Answer Quality: {answer_quality}

Generate ONE new question about {topic} that is {adapt}.
It should be different from the previous question.
The question MUST be answerable verbally/orally — do NOT ask to write code, draw diagrams, or implement anything.
Return ONLY the question text, nothing else."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200
    )

    return {
        "question_text": response.choices[0].message.content.strip(),
        "is_follow_up": is_follow_up,
        "new_difficulty": new_difficulty
    }