import re
import fitz
from typing import Optional


SKILLS_KEYWORDS = [
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "ruby",
    "react", "next.js", "vue", "angular", "node.js", "express", "fastapi", "flask", "django",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn",
    "sql", "postgresql", "mysql", "sqlite", "mongodb", "redis", "elasticsearch", "cassandra",
    "docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "git", "linux",
    "machine learning", "deep learning", "nlp", "computer vision", "reinforcement learning",
    "neural network", "transformer", "bert", "llm", "rag", "vector database", "langchain",
    "rest api", "graphql", "grpc", "microservices", "system design", "data structures", "algorithms",
    "openai", "hugging face", "chromadb", "pinecone", "weaviate", "faiss",
    "spark", "hadoop", "kafka", "airflow", "dbt",
    "html", "css", "tailwind", "webpack", "vite",
]

DOMAIN_KEYWORDS = {
    "ai/ml": [
        "machine learning", "deep learning", "neural", "nlp", "computer vision",
        "tensorflow", "pytorch", "scikit", "model training", "gradient", "bert", "transformer",
        "llm", "embedding", "rag", "langchain", "hugging face",
    ],
    "backend": [
        "api", "server", "database", "microservice", "rest", "fastapi", "flask", "django",
        "node", "express", "sql", "postgresql", "redis", "kafka", "backend engineer",
    ],
    "frontend": [
        "react", "vue", "angular", "next.js", "css", "html", "ui", "ux", "typescript",
        "webpack", "vite", "tailwind", "frontend engineer",
    ],
    "data science": [
        "pandas", "numpy", "matplotlib", "data analysis", "statistics", "jupyter",
        "kaggle", "exploratory", "feature engineering", "data scientist",
    ],
    "devops": [
        "docker", "kubernetes", "ci/cd", "aws", "gcp", "azure", "terraform",
        "ansible", "jenkins", "devops", "infrastructure",
    ],
}

EXPERIENCE_INDICATORS = {
    "senior": [
        "senior", "lead", "principal", "architect", "head of", "staff engineer",
        "7+ years", "8+ years", "9+ years", "10+ years",
    ],
    "junior": [
        "fresher", "entry level", "intern", "recent graduate", "new graduate",
        "final year", "0-1 year", "1 year experience",
    ],
}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore").strip()


def extract_skills(text: str) -> list:
    text_lower = text.lower()
    found = []
    for skill in SKILLS_KEYWORDS:
        if skill in text_lower and skill not in found:
            found.append(skill)
    return found


def extract_domain_signals(text: str) -> list:
    text_lower = text.lower()
    domains = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        match_count = sum(1 for k in keywords if k in text_lower)
        if match_count >= 2:
            domains.append(domain)
    return domains


def estimate_experience_level(text: str) -> str:
    text_lower = text.lower()
    for level, signals in EXPERIENCE_INDICATORS.items():
        if any(s in text_lower for s in signals):
            return level

    years_pattern = re.compile(r"(\d+)\+?\s*years?\s+(?:of\s+)?experience", re.IGNORECASE)
    matches = years_pattern.findall(text)
    if matches:
        max_years = max(int(y) for y in matches)
        if max_years >= 5:
            return "senior"
        if max_years >= 2:
            return "mid-level"
        return "junior"

    return "mid-level"


def parse_resume(file_bytes: bytes, filename: str) -> dict:
    if filename.lower().endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    else:
        text = extract_text_from_txt(file_bytes)

    if not text or len(text.strip()) < 50:
        raise ValueError("Resume appears to be empty or unreadable")

    skills = extract_skills(text)
    domains = extract_domain_signals(text)
    experience_level = estimate_experience_level(text)

    return {
        "raw_text": text,
        "skills": skills,
        "domain_exposure": domains,
        "experience_level": experience_level,
        "word_count": len(text.split()),
    }
