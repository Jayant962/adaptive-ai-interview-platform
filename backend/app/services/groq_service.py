"""
Groq AI Service
Handles: Question generation, follow-up generation, technical evaluation
Uses: groq Python SDK with llama-3.3-70b-versatile
"""
import json
import re
import random
from typing import Dict, Optional
from groq import Groq
from app.config import settings
from app.prompts.interview_prompts import (
    QUESTION_GENERATION_PROMPT,
    FOLLOW_UP_GENERATION_PROMPT,
    TECHNICAL_EVALUATION_PROMPT,
    REPORT_SUMMARY_PROMPT,
)

# Initialize Groq client safely (Local Offline fallback if no key is set)
groq_client = None
is_mock_mode = False

if (
    not settings.GROQ_API_KEY
    or settings.GROQ_API_KEY == ""
    or settings.GROQ_API_KEY.startswith("gsk_your")
    or settings.GROQ_API_KEY == "mock"
):
    is_mock_mode = True
    print("[WARNING] Groq API key is missing or set to mock. Running in Offline Mock AI Mode!")
else:
    try:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
    except Exception as e:
        is_mock_mode = True
        print(f"[WARNING] Failed to initialize Groq client: {e}. Running in Offline Mock AI Mode!")

MODEL = "llama-3.3-70b-versatile"
MAX_FOLLOW_UPS = {"easy": 1, "medium": 2, "hard": 3}

# High-Quality Premium Mock Questions for Offline Mode
MOCK_QUESTIONS = {
    "react": {
        "easy": [
            "What is the difference between Functional and Class components in React?",
            "What are React Hooks, and why were they introduced?",
            "Explain the concept of 'Props' and 'State' in React.",
            "What is the Virtual DOM, and how does React use it to optimize rendering?",
            "What is the purpose of the useEffect hook in React?"
        ],
        "medium": [
            "How does the lifecycle of a functional component using hooks compare to a class component?",
            "What is the Context API in React, and when should you use it over Redux?",
            "Explain the difference between useMemo and useCallback hooks with examples.",
            "What are controlled vs uncontrolled components in React?",
            "Explain React's reconciliation algorithm and the importance of 'key' prop in lists."
        ],
        "hard": [
            "Explain React Concurrent Mode, Suspense, and how Server Components work under the hood.",
            "How does React handle state updates batching in React 18, and how does it affect rendering?",
            "Design a custom hook to fetch data with caching, auto-retry, and request deduplication.",
            "Explain how the fiber architecture works in React. What are fibers and how do they enable interruptible rendering?",
            "Describe advanced performance optimization techniques for a large-scale React application."
        ]
    },
    "python": {
        "easy": [
            "What are the main differences between Lists and Tuples in Python?",
            "Explain how memory management works in Python. What is the Global Interpreter Lock (GIL)?",
            "What is a dictionary in Python, and how is it implemented under the hood?",
            "Explain the difference between 'is' and '==' in Python.",
            "What are Python decorators and how do you write a simple one?"
        ],
        "medium": [
            "Explain generators and the 'yield' keyword in Python. What are their memory benefits?",
            "What is the difference between deepcopy and shallow copy in Python?",
            "How does Python's multiple inheritance work? Explain the Method Resolution Order (MRO).",
            "What are list comprehensions, generator expressions, and set comprehensions in Python?",
            "Explain context managers and the 'with' statement. How do you create a custom one?"
        ],
        "hard": [
            "Explain Python's garbage collection mechanism, reference counting, and how it handles cyclic references.",
            "How does the GIL affect multi-threading in Python, and how can we achieve true parallelism?",
            "Explain metaclasses in Python. When would you use them and how do they work?",
            "How do descriptors work in Python? Explain the difference between __get__, __set__, and __delete__.",
            "Explain the asyncio event loop and how asynchronous concurrency works under the hood in Python."
        ]
    },
    "sql": {
        "easy": [
            "What is the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN in SQL?",
            "What are primary keys and foreign keys in a relational database?",
            "What is the purpose of the GROUP BY clause and how does it differ from ORDER BY?",
            "Explain the difference between WHERE and HAVING clauses in SQL.",
            "What is database normalization and why is it important?"
        ],
        "medium": [
            "What are database indexes, and how do B-Tree indexes speed up query execution?",
            "Explain the ACID properties of a database transaction in detail.",
            "What are window functions in SQL? Provide examples like ROW_NUMBER() or DENSE_RANK().",
            "What is the difference between Clustered and Non-Clustered indexes?",
            "Explain the different database transaction isolation levels and the anomalies they prevent (e.g. dirty reads)."
        ],
        "hard": [
            "How do database query engines optimize execution plans, and how do you diagnose query performance issues using EXPLAIN?",
            "Design a highly scalable database schema for a real-time messaging application. What indexing strategy would you use?",
            "Explain database sharding, replication (sync vs async), and partitioning. When should you use each?",
            "How do database locks work? Explain the difference between Shared, Exclusive, and Intent locks and how deadlocks are resolved.",
            "Explain MVCC (Multi-Version Concurrency Control) and how relational databases handle concurrent writes without locking."
        ]
    },
    "javascript": {
        "easy": [
            "What is the difference between 'let', 'const', and 'var' in JavaScript?",
            "Explain the concept of closures in JavaScript with a simple example.",
            "What is the difference between '==' and '===' operators in JavaScript?",
            "What is the event loop in JavaScript and how does it handle asynchronous code?",
            "Explain prototypal inheritance in JavaScript."
        ],
        "medium": [
            "What are Promises in JavaScript, and how do they resolve the callback hell issue?",
            "Explain the 'this' keyword in JavaScript and how it behaves in different contexts.",
            "What is the difference between call(), apply(), and bind() methods?",
            "Explain event bubbling, event capturing, and event delegation in JavaScript.",
            "What is the difference between throttle and debounce, and where are they useful?"
        ],
        "hard": [
            "Explain the internal implementation of the JavaScript event loop, microtasks, macrotasks, and render phases.",
            "How does JavaScript garbage collection work? Explain mark-and-sweep, memory leaks, and how to detect them.",
            "Explain the prototype chain under the hood and how to implement a custom class compilation/transpilation mechanism.",
            "Design a custom Promise library supporting Promise.all, Promise.race, and Promise.allSettled.",
            "Explain the difference between Web Workers and Service Workers, and how to leverage them for multi-threaded JS execution."
        ]
    },
    "data structures": {
        "easy": [
            "What is the difference between an Array and a Linked List?",
            "What is a Stack and a Queue, and how do they differ in retrieval?",
            "Explain the concept of Big O notation and how it is used to measure time complexity.",
            "What is a Binary Tree, and how does it differ from a Binary Search Tree?",
            "What is a Hash Map, and how does it handle key-value mapping?"
        ],
        "medium": [
            "How does a Hash Map handle collisions under the hood (e.g., chaining vs open addressing)?",
            "What is the difference between Depth First Search (DFS) and Breadth First Search (BFS)?",
            "Explain how a Merge Sort algorithm works and its time/space complexity.",
            "What is a Red-Black Tree or AVL Tree, and why is self-balancing important in search trees?",
            "Explain the difference between a Directed and an Undirected Graph, and how to represent them."
        ],
        "hard": [
            "Explain the difference between Trie, Segment Tree, and Fenwick Tree. What problems do they optimize?",
            "Design a Cache eviction policy like LRU or LFU. Describe the time/space complexities of your implementation.",
            "Describe Dijkstra's algorithm, its time complexity using an adjacency list with a binary heap, and how it handles negative weights.",
            "What are Strongly Connected Components, and how does Tarjan's or Kosaraju's algorithm find them?",
            "Explain B+ Trees under the hood. Why are they preferred over Red-Black trees for database storage indexing?"
        ]
    },
    "system design": {
        "easy": [
            "What is the difference between horizontal and vertical scaling?",
            "What is a Load Balancer, and how does it distribute traffic?",
            "Explain what a Content Delivery Network (CDN) is and how it speeds up load times.",
            "What is caching, and at what layers of a system can we implement it?",
            "What is the difference between Monolithic and Microservices architectures?"
        ],
        "medium": [
            "Explain the CAP Theorem and how it affects the design of distributed databases.",
            "What is consistent hashing, and how is it used in caching and load balancing?",
            "What are the differences between SQL (Relational) and NoSQL (Non-Relational) databases, and when should you choose each?",
            "How does a message queue like RabbitMQ or Kafka help in decoupling microservices?",
            "Design a URL Shortener service (like Bit.ly) — describe the API, database schema, and scaling strategy."
        ],
        "hard": [
            "Design a highly available and globally distributed chat application like WhatsApp. How do you handle connection state and delivery receipts?",
            "How do you design a high-throughput, low-latency search auto-complete system? Explain the trie structure, caching, and data ingestion pipelines.",
            "Design a distributed rate limiter. What algorithms (token bucket, sliding window) and databases (Redis) would you use?",
            "Explain the Paxos and Raft consensus algorithms. How do they handle network partitions and leader election?",
            "Design a video streaming platform like Netflix. Explain the ingestion, transcoding, storage, CDN delivery, and user activity tracking architectures."
        ]
    },
    "machine learning": {
        "easy": [
            "What is the difference between Supervised and Unsupervised Learning?",
            "What is Overfitting, and how can we prevent it?",
            "Explain the difference between classification and regression with simple examples.",
            "What is a Confusion Matrix, and how is it used to evaluate a model?",
            "What are the main steps in a typical data science pipeline?"
        ],
        "medium": [
            "How do Precision and Recall compare? When would you prioritize one over the other?",
            "Explain the difference between L1 (Lasso) and L2 (Ridge) regularization.",
            "What is Gradient Descent, and how do learning rate values affect training?",
            "How does a Random Forest model work under the hood, and what are its advantages?",
            "Explain what Agentic AI is and how it differs from traditional LLM pipelines."
        ],
        "hard": [
            "Explain the bias-variance tradeoff in detail. How do we measure and optimize it?",
            "How does the self-attention mechanism work in Transformer models under the hood?",
            "Explain the vanishing and exploding gradient problems. What techniques solve these issues?",
            "Design a real-time recommendation system pipeline. How do you handle feature store updates?",
            "Explain Reinforcement Learning from Human Feedback (RLHF). How does it optimize model alignment?"
        ]
    },
    "programming": {
        "easy": [
            "What are the four pillars of Object-Oriented Programming (OOP)?",
            "What is the difference between abstract classes and interfaces?",
            "Explain the difference between method overloading and method overriding.",
            "What is the purpose of constructors in OOP languages like Java or C++?",
            "What is encapsulation, and why is it important in software development?"
        ],
        "medium": [
            "What is the difference between a pointer and a reference, particularly in C++?",
            "How does inheritance compare to composition? When should you prefer composition?",
            "Explain memory management differences: stack allocation versus heap allocation.",
            "What is polymorphism? Provide a concrete practical example of compile-time vs run-time polymorphism.",
            "Explain exception handling propagation and memory safety in C++ or Java."
        ],
        "hard": [
            "How does dynamic dispatch work under the hood in C++ using vtables and vptrs?",
            "Explain the Solid principles in detail. How do they prevent architectural regressions in large projects?",
            "What are smart pointers in C++, and how do unique_ptr, shared_ptr, and weak_ptr manage reference cycles?",
            "Explain Java's memory model, garbage collection roots, and how weak references prevent leaks.",
            "Design a memory-safe object pool pattern in C++ supporting concurrent thread access."
        ]
    },
    "operating systems": {
        "easy": [
            "What is the difference between a Process and a Thread?",
            "What is virtual memory, and what is its purpose in an operating system?",
            "What is a system call, and how does it differ from a standard function call?",
            "Explain the concepts of paging and segmentation in memory management.",
            "What is a deadlock, and what are the four necessary conditions for it to occur?"
        ],
        "medium": [
            "What is the difference between a Mutex and a Semaphore? Give real-world examples.",
            "Explain context switching. What overhead is involved when context switching between threads?",
            "Describe the difference between preemptive and non-preemptive CPU scheduling algorithms.",
            "What is thrashing in OS memory management, and how can it be resolved?",
            "Explain inter-process communication (IPC) mechanisms and how shared memory compares to message passing."
        ],
        "hard": [
            "Explain how the Linux kernel handles page faults under the hood. Describe the translation lookaside buffer (TLB).",
            "Describe the Bankers Algorithm for deadlock avoidance and explain its time complexity.",
            "Explain the difference between kernel-level threads and user-level threads. How does the 1:1 mapping work in modern OS?",
            "Design a lock-free ring buffer for thread communication. What atomic operations are required?",
            "How does memory-mapped file I/O (mmap) work under the hood, and how does it compare to standard read/write calls?"
        ]
    },
    "computer networks": {
        "easy": [
            "What is the difference between TCP and UDP protocols?",
            "Explain the purpose and function of the DNS (Domain Name System).",
            "What is an IP address, and how does IPv4 differ from IPv6?",
            "What is the difference between HTTP and HTTPS protocols?",
            "What is a MAC address, and how does it differ from an IP address?"
        ],
        "medium": [
            "Explain the TCP three-way handshake and the four-way termination process.",
            "How does a router determine the path of a packet? Explain the difference between routing and switching.",
            "What is the purpose of subnetting, and how does a subnet mask work?",
            "Explain how DHCP dynamically assigns IP addresses to devices on a network.",
            "Describe the OSI model layers and the primary function of each layer."
        ],
        "hard": [
            "Explain the TCP congestion control mechanism, including slow start, congestion avoidance, fast retransmit, and fast recovery.",
            "How does a DNS amplification attack work, and how can network administrators mitigate it?",
            "Explain how SSL/TLS handshake works in detail to establish a secure connection.",
            "Describe BGP (Border Gateway Protocol) routing anomalies and how security extensions (RPKI) prevent route hijacking.",
            "Design a load-balancing layer-4 vs layer-7 architecture. Explain the packet rewriting mechanism for each."
        ]
    },
    "hr": {
        "easy": [
            "Tell me about yourself. What are your core strengths and areas of interest?",
            "Why are you interested in joining our company, and what do you know about our product?",
            "What are your short-term and long-term career goals?",
            "How do you prioritize your tasks when working on multiple deadlines?",
            "What does good team collaboration mean to you?"
        ],
        "medium": [
            "Describe a challenging technical project you worked on. What was your role and how did you resolve roadblocks?",
            "Tell me about a time you had a conflict with a teammate or manager. How did you handle and resolve it?",
            "How do you handle receiving critical feedback about your work or code?",
            "Tell me about a time you made a mistake on a project. What did you learn and how did you fix it?",
            "Explain a complex technical concept you recently learned as if I were a non-technical stakeholder."
        ],
        "hard": [
            "Describe a situation where you had to lead a project with ambiguous requirements and tight deadlines. How did you align the stakeholders?",
            "Tell me about a time you disagreed with a major architectural decision made by your lead. How did you present your counter-arguments and what was the outcome?",
            "How do you approach mentoring junior developers or managing technical debt in a high-velocity product team?",
            "Describe a scenario where you had to balance shipping a critical feature quickly versus ensuring perfect code quality. What trade-offs did you make?",
            "How do you stay motivated and handle extreme pressure or production outages in a collaborative team environment?"
        ]
    },
    "general": {
        "easy": [
            "What is Git, and what are the basic commands like commit, push, and pull?",
            "What is clean code, and why are naming conventions and code readability important?",
            "What is an API, and what are the main differences between REST and SOAP?",
            "Explain the concept of Object-Oriented Programming (OOP) and its four core pillars.",
            "What are unit tests, and why should developers write them?"
        ],
        "medium": [
            "Explain the SOLID design principles in software engineering with real-world examples.",
            "What is CI/CD, and how does it improve software deployment pipelines?",
            "What is the difference between authentication and authorization?",
            "What are design patterns? Explain the Singleton and Factory patterns.",
            "What is technical debt, and how should engineering teams manage and reduce it?"
        ],
        "hard": [
            "How do you design a secure API security gateway for microservices? Talk about OAuth2, JWT, rate limiting, and SSL termination.",
            "Explain different architectural styles like Event-Driven Architecture, CQRS, and Domain-Driven Design.",
            "How do you approach refactoring a legacy, poorly-documented monolithic system into microservices without downtime?",
            "What is zero-downtime deployment (e.g. blue-green, canary, rolling updates), and how do you orchestrate it?",
            "Explain the concept of observability. What are logs, metrics, and distributed traces, and how do they help in troubleshooting distributed systems?"
        ]
    }
}

def generate_question(
    topic: str,
    difficulty: str,
    previous_questions: list[str]
) -> str:
    """
    Generate a single interview question using Groq or mock offline data.
    """
    if is_mock_mode:
        t_lower = topic.lower()
        key = "general"
        if "react" in t_lower:
            key = "react"
        elif "python" in t_lower:
            key = "python"
        elif any(x in t_lower for x in ["sql", "database", "postgres", "dbms"]):
            key = "sql"
        elif "javascript" in t_lower or "js" in t_lower:
            key = "javascript"
        elif any(x in t_lower for x in ["dsa", "data structure", "algorithm", "tree", "list"]):
            key = "data structures"
        elif any(x in t_lower for x in ["system design", "architecture"]):
            key = "system design"
        elif any(x in t_lower for x in ["machine", "learning", "artificial", "intelligence", "agentic", "data science", "analytics"]):
            key = "machine learning"
        elif any(x in t_lower for x in ["c++", "java", "oop", "programming", "obj", "c"]):
            key = "programming"
        elif "operating" in t_lower or "os" in t_lower:
            key = "operating systems"
        elif "network" in t_lower or "internet" in t_lower:
            key = "computer networks"
        elif any(x in t_lower for x in ["hr", "behavioral", "communication", "speak", "english"]):
            key = "hr"
        
        diff = difficulty.lower()
        if diff not in ["easy", "medium", "hard"]:
            diff = "medium"
            
        questions_list = MOCK_QUESTIONS.get(key, MOCK_QUESTIONS["general"])[diff]
        # Choose a question that hasn't been asked yet
        for q in questions_list:
            if q not in previous_questions:
                return q
        return random.choice(questions_list)

    previous_str = "\n".join([f"- {q}" for q in previous_questions]) if previous_questions else "None"

    prompt = QUESTION_GENERATION_PROMPT.format(
        topic=topic,
        difficulty=difficulty,
        previous_questions=previous_str,
    )

    try:
        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200,
        )
        question = response.choices[0].message.content.strip()
        question = re.sub(r'^["\']|["\']$', '', question)
        return question
    except Exception as e:
        raise Exception(f"Groq question generation failed: {str(e)}")


def generate_follow_up(
    original_question: str,
    user_answer: str,
    topic: str,
    difficulty: str,
    follow_up_number: int
) -> Dict:
    """
    Generate an adaptive follow-up question based on user's answer.
    Returns dict with generate_follow_up bool and follow_up_question.
    """
    max_follow_ups = MAX_FOLLOW_UPS.get(difficulty.lower(), 1)

    if follow_up_number >= max_follow_ups:
        return {
            "generate_follow_up": False,
            "follow_up_question": None,
            "reason": f"Maximum follow-ups ({max_follow_ups}) reached for {difficulty} difficulty",
        }
    if is_mock_mode:
        user_answer_clean = user_answer.strip()
        user_answer_lower = user_answer_clean.lower()
        
        # If very brief answer, ask for elaboration or code sample
        if len(user_answer_clean) < 45:
            # Try to extract a meaningful word to make it sound custom
            words = re.findall(r'[a-zA-Z]{4,}', user_answer_lower)
            ignored_words = {
                "explain", "difference", "concept", "because", "without", "through", 
                "really", "actually", "something", "sometimes", "another", "between",
                "should", "would", "could", "about", "their", "there", "these", "those",
                "which", "where", "while", "using", "under", "above", "below", "other"
            }
            probing_topics = [w for w in words if w not in ignored_words]
            probe_word = probing_topics[0] if probing_topics else "that approach"
            return {
                "generate_follow_up": True,
                "follow_up_question": f"That's a very brief summary about '{probe_word}'. Could you explain in more detail or provide a specific code or design example of how you would implement this in practice?",
                "reason": "Answer was too brief.",
            }

        # Look for specific topic matches
        performance_terms = ["usememo", "usecallback", "virtual dom", "reconciliation", "indexing", "cache", "memoization", "lazy loading", "suspense", "optimize"]
        state_db_terms = ["redux", "context", "zustand", "sql", "postgresql", "mongodb", "nosql", "database", "orm", "prisma", "sqlalchemy", "state management", "schema"]
        web_api_terms = ["rest", "graphql", "websocket", "fastapi", "express", "api", "middleware", "endpoint", "async/await", "promise", "closure", "callback", "http"]

        matched_perf = next((t for t in performance_terms if t in user_answer_lower), None)
        matched_state = next((t for t in state_db_terms if t in user_answer_lower), None)
        matched_api = next((t for t in web_api_terms if t in user_answer_lower), None)

        if matched_perf:
            follow_up_q = f"You mentioned '{matched_perf}'. While optimization is great, it introduces computational or memory overhead. Can you explain the cost of using it and specify a scenario where it might actually hurt performance?"
            reason = "Probing performance trade-offs."
        elif matched_state:
            follow_up_q = f"Since you brought up '{matched_state}', how does it compare to its main alternatives in terms of scalability, complexity, or data consistency? When would you choose one over the other?"
            reason = "Probing state/DB architecture alternatives."
        elif matched_api:
            follow_up_q = f"You talked about '{matched_api}'. What is the biggest challenge or common pitfall developers run into when implementing or debugging this concept in production, and how do you prevent it?"
            reason = "Probing API/implementation pitfalls."
        else:
            # Fallback keyword extraction
            words = re.findall(r'[a-zA-Z]{5,}', user_answer_lower)
            ignored_words = {
                "explain", "difference", "concept", "because", "without", "through", 
                "really", "actually", "something", "sometimes", "another", "between",
                "should", "would", "could", "about", "their", "there", "these", "those",
                "which", "where", "while", "using", "under", "above", "below", "other",
                "understand", "implement", "problem", "solution", "project", "system"
            }
            probing_topics = [w for w in words if w not in ignored_words]
            probe_word = probing_topics[0] if probing_topics else "this concept"
            
            follow_up_q = f"You highlighted the role of '{probe_word}'. Could you elaborate on how this functions under the hood and walk me through the key architectural trade-offs you have to consider when using it?"
            reason = "Probing deeper into extracted technical keyword."

        return {
            "generate_follow_up": True,
            "follow_up_question": follow_up_q,
            "reason": reason,
        }

    prompt = FOLLOW_UP_GENERATION_PROMPT.format(
        original_question=original_question,
        user_answer=user_answer,
        topic=topic,
        difficulty=difficulty,
        follow_up_number=follow_up_number + 1,
        max_follow_ups=max_follow_ups,
    )

    try:
        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=300,
        )
        content = response.choices[0].message.content.strip()

        try:
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(content)
        except json.JSONDecodeError:
            return {
                "generate_follow_up": False,
                "follow_up_question": None,
                "reason": "Could not parse follow-up decision",
            }

        return {
            "generate_follow_up": result.get("generate_follow_up", False),
            "follow_up_question": result.get("follow_up_question"),
            "reason": result.get("reason", ""),
        }

    except Exception as e:
        return {
            "generate_follow_up": False,
            "follow_up_question": None,
            "reason": f"Follow-up generation error: {str(e)}",
        }


def evaluate_technical(
    question: str,
    answer: str,
    topic: str,
    difficulty: str
) -> Dict:
    """
    Evaluate the technical quality of a user's answer.
    Returns scores and feedback.
    """
    # Strict check: empty or very short answers get 0% score
    if not answer or len(answer.strip()) < 8:
        return {
            "technical_score": 0.0,
            "conceptual_score": 0.0,
            "relevance_score": 0.0,
            "strengths": [],
            "weaknesses": ["No answer provided. Candidate did not speak or answer was too brief to analyze."],
            "suggestions": ["Make sure to attempt the question with a full explanation or code/concept keywords."],
            "brief_overview": "No answer was provided or the response was too brief to evaluate."
        }

    ans_lower = answer.lower()
    word_count = len(answer.split())

    # Strict check: generic, evasive, or "I don't know" style responses get minimum 0.0 score
    generic_phrases = [
        "i don't know", "i do not know", "i am not sure", "no idea", "not sure",
        "let me think", "i forgot", "pass", "no comment", "don't know", "skip"
    ]
    is_generic = any(phrase in ans_lower for phrase in generic_phrases) or word_count < 8

    if is_generic:
        return {
            "technical_score": 0.0,
            "conceptual_score": 0.0,
            "relevance_score": 0.0,
            "strengths": [],
            "weaknesses": ["Answer is extremely brief, generic, or indicates no knowledge of the topic."],
            "suggestions": ["Avoid using filler or evasive phrases. Try to explain any concepts or structures related to the question."],
            "brief_overview": "The candidate's response was generic or evasive (e.g. they stated they did not know or skipped the question)."
        }

    if is_mock_mode:
        buzzwords = {
            "react": ["component", "state", "effect", "virtual dom", "hook", "props", "render", "context", "memo", "callback", "fiber", "lifecycle", "performance"],
            "python": ["list", "tuple", "decorator", "generator", "class", "function", "gil", "memory", "yield", "copy", "mro", "inheritance", "async", "await", "garbage"],
            "sql": ["select", "join", "group by", "where", "index", "primary key", "foreign key", "table", "having", "acid", "transaction", "explain", "shard", "lock"],
            "javascript": ["let", "const", "var", "closure", "event loop", "promise", "this", "bind", "call", "apply", "bubble", "throttle", "debounce", "prototype", "worker"],
            "data structures": ["array", "list", "stack", "queue", "big o", "tree", "bst", "hash", "dfs", "bfs", "sort", "graph", "trie", "heap", "complexity"],
            "system design": ["scale", "load balancer", "cdn", "cache", "monolith", "microservice", "cap theorem", "sql", "nosql", "queue", "kafka", "sharding", "replication"],
            "machine learning": ["model", "feature", "train", "dataset", "learning", "algorithm", "neural network", "regression", "classification", "data science", "agent", "llm", "pipeline"],
            "programming": ["class", "object", "inheritance", "polymorphism", "encapsulation", "abstraction", "oop", "pointer", "memory", "overload", "override", "constructor"],
            "operating systems": ["process", "thread", "memory", "cpu", "scheduler", "deadlock", "mutex", "semaphore", "paging", "virtual memory", "system call", "kernel"],
            "computer networks": ["tcp", "ip", "dns", "http", "routing", "protocol", "port", "packet", "handshake", "socket", "subnet", "dhcp", "mac"],
            "hr": ["experience", "team", "conflict", "weakness", "strength", "project", "career", "leadership", "communication", "collaborate", "problem solving", "resolve"],
            "general": ["engineering", "system", "process", "design", "requirement", "verify", "test", "implementation", "project", "analysis", "code", "architecture"]
        }
        
        t_lower = topic.lower()
        key = "general"
        if "react" in t_lower:
            key = "react"
        elif "python" in t_lower:
            key = "python"
        elif any(x in t_lower for x in ["sql", "database", "postgres", "dbms"]):
            key = "sql"
        elif "javascript" in t_lower or "js" in t_lower:
            key = "javascript"
        elif any(x in t_lower for x in ["dsa", "data structure", "algorithm", "tree", "list"]):
            key = "data structures"
        elif any(x in t_lower for x in ["system design", "architecture"]):
            key = "system design"
        elif any(x in t_lower for x in ["machine", "learning", "artificial", "intelligence", "agentic", "data science", "analytics"]):
            key = "machine learning"
        elif any(x in t_lower for x in ["c++", "java", "oop", "programming", "obj", "c"]):
            key = "programming"
        elif "operating" in t_lower or "os" in t_lower:
            key = "operating systems"
        elif "network" in t_lower or "internet" in t_lower:
            key = "computer networks"
        elif any(x in t_lower for x in ["hr", "behavioral", "communication", "speak", "english"]):
            key = "hr"
            
        target_words = buzzwords[key]
        matches = [w for w in target_words if w in ans_lower]
        match_ratio = len(matches) / len(target_words)
        
        # Strict Mock scoring logic
        base_score = 15.0
        # Word count contribution (max 25 points)
        base_score += min(25.0, (word_count / 100) * 25.0)
        # Keyword matches contribution (max 50 points)
        base_score += min(50.0, match_ratio * 100.0)
        
        # Cap score strictly if key terms are missing
        if len(matches) == 0:
            score = 0.0
        else:
            if len(matches) < 2:
                base_score = min(base_score, 45.0)
            elif len(matches) < 4:
                base_score = min(base_score, 65.0)
            score = round(min(96.0, base_score), 1)
        
        strengths = []
        weaknesses = []
        suggestions = []
        
        if score == 0.0:
            weaknesses.append("Did not include specific technical terminology for this topic.")
            suggestions.append("Explain topics thoroughly by outlining architectures, components, or syntax.")
            brief_overview = "The candidate spoke off-topic, or did not provide relevant technical keywords for the question."
        else:
            if len(matches) >= 3:
                strengths.append(f"Successfully mentioned core concepts like {', '.join(matches[:3])}.")
            elif len(matches) > 0:
                strengths.append(f"Touched upon basic terms like '{matches[0]}'.")
                
            if word_count > 60:
                strengths.append("Provided a good detailed response length.")
            else:
                weaknesses.append("Response was brief and lacked depth.")
                suggestions.append("Explain topics thoroughly by outlining architectures, components, or syntax.")
                
            missing = [w for w in target_words if w not in ans_lower]
            if missing:
                weaknesses.append(f"Did not cover important technical aspects such as '{missing[0]}'.")
                suggestions.append(f"Incorporate an explanation of '{missing[0]}' to demonstrate deeper understanding.")
                
            suggestions.append("Mention real-world project usage or design patterns you have implemented.")
            brief_overview = f"The candidate demonstrated basic technical knowledge of the topic, mentioning terms like {', '.join(matches[:2])}."
        
        return {
            "technical_score": score,
            "conceptual_score": round(max(0.0, score - 2.0), 1),
            "relevance_score": round(max(0.0, score + 1.0), 1),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions,
            "brief_overview": brief_overview,
        }

    prompt = TECHNICAL_EVALUATION_PROMPT.format(
        question=question,
        answer=answer,
        topic=topic,
        difficulty=difficulty,
    )

    try:
        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        content = response.choices[0].message.content.strip()

        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(content)

        tech_score = float(result.get("technical_score", 50.0))
        conceptual_score = float(result.get("conceptual_score", 50.0))
        relevance_score = float(result.get("relevance_score", 50.0))
        brief_overview = result.get("brief_overview", "No overview available.")

        # Stricter override: If relevance is low (off-topic), zero out all scores
        if relevance_score < 35.0:
            tech_score = 0.0
            conceptual_score = 0.0
            relevance_score = 0.0
            brief_overview = "The candidate's response was completely off-topic or irrelevant to the question asked."

        return {
            "technical_score": tech_score,
            "conceptual_score": conceptual_score,
            "relevance_score": relevance_score,
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
            "suggestions": result.get("suggestions", []),
            "brief_overview": brief_overview,
        }

    except Exception as e:
        return {
            "technical_score": 50.0,
            "conceptual_score": 50.0,
            "relevance_score": 50.0,
            "strengths": [],
            "weaknesses": ["Evaluation could not be completed"],
            "suggestions": ["Please try again"],
            "brief_overview": "Evaluation could not be completed due to an error.",
        }


def generate_report_summary(
    topic: str,
    difficulty: str,
    technical_score: float,
    communication_score: float,
    total_questions: int,
    question_summaries: str
) -> Dict:
    """
    Generate a professional report summary.
    """
    if is_mock_mode:
        strengths_summary = [
            f"Demonstrated good command over {topic} topics at {difficulty} level.",
            "Structured explanations with high relevance to technical questions.",
            "Showed strong vocabulary diversity and clear speaking flow."
        ]
        
        weaknesses_summary = [
            "Can go deeper into extreme edge cases or under-the-hood internal mechanics.",
            "A few filler words detected during speech transitions.",
            "Some explanations could benefit from concrete architectural diagrams or code sketches."
        ]
        
        improvement_plan = [
            f"Deepen knowledge in {topic} advanced concepts (such as concurrency, optimization, and memory profiling).",
            "Practice mock sessions with a focus on eliminating filler words like 'basically' and 'like' using deliberate pauses.",
            "Incorporate standard software design patterns and architectural tradeoffs in future responses."
        ]
        
        return {
            "strengths_summary": strengths_summary,
            "weaknesses_summary": weaknesses_summary,
            "improvement_plan": improvement_plan,
        }

    prompt = REPORT_SUMMARY_PROMPT.format(
        topic=topic,
        difficulty=difficulty,
        technical_score=round(technical_score, 1),
        communication_score=round(communication_score, 1),
        total_questions=total_questions,
        question_summaries=question_summaries,
    )

    try:
        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=600,
        )
        content = response.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(content)

        return {
            "strengths_summary": result.get("strengths_summary", []),
            "weaknesses_summary": result.get("weaknesses_summary", []),
            "improvement_plan": result.get("improvement_plan", []),
        }
    except Exception:
        return {
            "strengths_summary": ["Completed the interview session"],
            "weaknesses_summary": ["Areas for improvement identified"],
            "improvement_plan": ["Practice more interviews to improve performance"],
        }


def generate_job_fit(topic_scores: dict, avg_tech: float, avg_concept: float, avg_comm: float) -> dict:
    """
    Generate job role recommendation using Groq LLM or dynamic fallback rules.
    """
    if is_mock_mode:
        # Dynamic fallback rules based on topic scores
        # Find strongest topics
        sorted_topics = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)
        strongest = [t for t, s in sorted_topics if s >= 50]
        if not strongest:
            strongest = list(topic_scores.keys())

        roles = []
        # Frontend check
        if any(any(x in t.lower() for x in ["react", "javascript", "js", "frontend"]) for t in strongest):
            roles.append({
                "role": "Frontend Engineer (React)",
                "match_percentage": 88,
                "justification": "Demonstrated solid understanding of React component design, hook lifecycles, and modern JavaScript standards.",
                "next_steps": "Bridge database querying gaps and study API design structures."
            })
        # Data Science / ML check
        if any(any(x in t.lower() for x in ["data science", "machine", "ml", "python"]) for t in strongest):
            roles.append({
                "role": "Data Scientist / ML Engineer",
                "match_percentage": 85,
                "justification": "Good foundation in Python metrics, statistical learning pipelines, and predictive analytics data flows.",
                "next_steps": "Improve big data ecosystem concepts and deploy models to cloud environments."
            })
        # Database check
        if any(any(x in t.lower() for x in ["sql", "database", "db"]) for t in strongest):
            roles.append({
                "role": "Database Developer / Analyst",
                "match_percentage": 82,
                "justification": "Exhibited strong knowledge of SQL query normalization, table relationships, and indexing patterns.",
                "next_steps": "Explore database administrative policies and query performance optimization tools."
            })
            
        # Fallbacks
        if not roles:
            roles.append({
                "role": "Software Engineer (Generalist)",
                "match_percentage": 80,
                "justification": "Demonstrated logical problem-solving and basic programming structure capabilities.",
                "next_steps": "Select a specific engineering track (Frontend, Backend, or Data Science) to build expertise."
            })
        if len(roles) < 2:
            roles.append({
                "role": "Technical Systems Analyst",
                "match_percentage": 76,
                "justification": "Good balance between programming concepts, verification flow, and analytical presentation.",
                "next_steps": "Incorporate software architecture design paradigms and unit testing frameworks."
            })
            
        return {"recommended_roles": roles[:2]}

    # Otherwise, use Groq model!
    topic_scores_str = "\n".join([f"- {t}: {s:.1f}/100" for t, s in topic_scores.items()])
    prompt = f"""You are a senior recruiter and talent advisor. You are analyzing a candidate's mock interview performance data to determine which job roles they are a perfect fit for.
   
Topic Performance (Average Scores per Topic):
{topic_scores_str}

Overall Averages:
- Technical Score: {avg_tech:.1f}/100
- Conceptual Understanding: {avg_concept:.1f}/100
- Communication Score: {avg_comm:.1f}/100

Based on this performance across these technical topics, determine:
1. The TOP 2 job roles the candidate is a perfect fit for (e.g. "React Frontend Developer", "Data Scientist", "Backend Engineer", "Machine Learning Engineer").
2. For each role, provide:
   - Match percentage (integer, e.g. 85)
   - Brief justification (why they fit this role based on their topic scores and skills, 20-30 words)
   - Recommended next steps to bridge any gaps (15-20 words)

Return ONLY a valid JSON object in this exact format:
{{
  "recommended_roles": [
    {{
      "role": "Role Name 1",
      "match_percentage": 90,
      "justification": "Justification here...",
      "next_steps": "Next steps here..."
    }},
    {{
      "role": "Role Name 2",
      "match_percentage": 75,
      "justification": "Justification here...",
      "next_steps": "Next steps here..."
    }}
  ]
}}
"""
    try:
        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=600,
        )
        content = response.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(content)
        return result
    except Exception as e:
        print(f"Error generating job fit via Groq: {e}")
        # Return fallback values
        return {
            "recommended_roles": [
                {
                    "role": "Software Engineer (Generalist)",
                    "match_percentage": 80,
                    "justification": "Solid technical base with standard conceptual knowledge across practice topics.",
                    "next_steps": "Practice dedicated coding scenarios and review system designs."
                },
                {
                    "role": "Technical Analyst",
                    "match_percentage": 75,
                    "justification": "Balanced analytical skills and verbal articulation suitable for cross-functional engineering.",
                    "next_steps": "Review programming language mechanics and database indexes."
                }
            ]
        }

