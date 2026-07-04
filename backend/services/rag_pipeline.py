import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict

from config import settings

ROLE_COLLECTION_MAP = {
    "AI/ML Engineer": "ai_ml",
    "Backend Engineer": "backend",
    "Data Scientist": "data_science",
    "Full Stack Engineer": "fullstack",
}

class RAGPipeline:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.db_path = os.path.join(settings.CHROMA_PERSIST_DIR, "vector_store.json")
        self._collections = {}
        self.load_db()

    def load_db(self):
        if os.path.exists(self.db_path):
            with open(self.db_path, "r") as f:
                self._collections = json.load(f)
                # Convert embedding lists back to numpy arrays
                for role in self._collections:
                    for chunk in self._collections[role]:
                        chunk["embedding"] = np.array(chunk["embedding"])

    def retrieve(self, role: str, query: str, n_results: int = 5) -> List[Dict]:
        collection_name = ROLE_COLLECTION_MAP.get(role, "general")
        chunks = self._collections.get(collection_name, [])
        if not chunks:
            return []

        query_embedding = self.model.encode(query)
        
        # Compute cosine similarities
        scored_chunks = []
        for chunk in chunks:
            emb = chunk["embedding"]
            # Cosine similarity
            similarity = np.dot(query_embedding, emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(emb))
            scored_chunks.append({
                "text": chunk["text"],
                "metadata": {"topic": chunk["topic"]},
                "score": float(similarity)
            })

        # Sort by highest similarity
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:n_results]

    def build_retrieval_query(
        self,
        role: str,
        resume_profile: dict,
        question_history: list,
    ) -> str:
        skills = ", ".join(resume_profile.get("skills", [])[:6])
        domains = ", ".join(resume_profile.get("domain_exposure", []))
        level = resume_profile.get("experience_level", "mid-level")

        recent_topics = ""
        if question_history:
            recent = question_history[-2:]
            recent_topics = " ".join(q.get("question", "")[:100] for q in recent)

        query = (
            f"{role} technical concepts for {level} candidate. "
            f"Skills: {skills}. Domains: {domains}. {recent_topics}"
        )
        return query.strip()

rag_pipeline = RAGPipeline()
