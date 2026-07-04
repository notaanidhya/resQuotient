import google.generativeai as genai
from typing import List, Dict, Generator

from config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

DIFFICULTY_GUIDANCE = {
    "junior": (
        "Focus on foundational concepts and basic implementations. "
        "Ask the candidate to explain core ideas in their own words. "
        "Avoid advanced system design or complex trade-off questions."
    ),
    "mid-level": (
        "Include design considerations and practical trade-offs. "
        "Ask about real-world application of concepts and handling of edge cases. "
        "Expect working knowledge beyond tutorials."
    ),
    "senior": (
        "Probe architectural decisions and deep system understanding. "
        "Ask about scaling concerns, failure modes, and justification for design choices. "
        "Expect nuanced, experience-backed answers."
    ),
}


class QuestionGenerator:
    def __init__(self):
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def _build_question_prompt(
        self,
        role: str,
        resume_profile: dict,
        retrieved_chunks: List[Dict],
        question_history: List[Dict],
        question_number: int,
        total_questions: int,
    ) -> str:
        context_text = "\n\n".join(c["text"] for c in retrieved_chunks[:4])

        skills_str = ", ".join(resume_profile.get("skills", [])[:8])
        domains_str = ", ".join(resume_profile.get("domain_exposure", []))
        level = resume_profile.get("experience_level", "mid-level")

        history_block = ""
        if question_history:
            answered = [h for h in question_history if h.get("answer")]
            if answered:
                recent = answered[-3:]
                pairs = [f"Q: {h['question']}\nA: {h['answer']}" for h in recent]
                history_block = "Interview so far:\n" + "\n\n".join(pairs)

        if question_number <= 2:
            progression = "This is an early question. Assess foundational knowledge."
        elif question_number >= total_questions - 1:
            progression = "This is a closing question. Ask something deeper or scenario-based to conclude."
        else:
            progression = "Build on what has already been discussed. Target any gaps or strong areas worth exploring further."

        return f"""You are conducting a structured technical interview for the role of {role}.

Candidate profile:
- Experience level: {level}
- Skills listed on resume: {skills_str if skills_str else "not specified"}
- Domain exposure: {domains_str if domains_str else "general"}

Knowledge base context (ground your question in this material):
{context_text if context_text else "Draw from general technical knowledge for this role."}

{history_block}

Question {question_number} of {total_questions}.
{progression}
Difficulty: {DIFFICULTY_GUIDANCE.get(level, DIFFICULTY_GUIDANCE["mid-level"])}

Write exactly one interview question. Requirements:
- Must be grounded in the knowledge base context above
- Must be specific to the candidate's background and role
- Must not repeat any topic already covered in the interview history
- Must sound like a natural question from a senior interviewer, not a textbook exercise
- For mid/senior: include a concrete scenario or trade-off to reason through
- For junior: keep it concept-focused but specific

Output only the question. No preamble, no numbering, no closing statement."""

    def generate_question(
        self,
        role: str,
        resume_profile: dict,
        retrieved_chunks: List[Dict],
        question_history: List[Dict],
        question_number: int,
        total_questions: int,
    ) -> str:
        prompt = self._build_question_prompt(
            role, resume_profile, retrieved_chunks,
            question_history, question_number, total_questions,
        )
        response = self.model.generate_content(prompt)
        return response.text.strip()

    def generate_question_stream(
        self,
        role: str,
        resume_profile: dict,
        retrieved_chunks: List[Dict],
        question_history: List[Dict],
        question_number: int,
        total_questions: int,
    ) -> Generator[str, None, None]:
        """Yields text chunks from Gemini streaming for SSE delivery."""
        prompt = self._build_question_prompt(
            role, resume_profile, retrieved_chunks,
            question_history, question_number, total_questions,
        )
        response = self.model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text

    def generate_session_insights(
        self,
        role: str,
        resume_profile: dict,
        qa_pairs: List[Dict],
    ) -> Dict:
        skills_str = ", ".join(resume_profile.get("skills", [])[:10])
        level = resume_profile.get("experience_level", "mid-level")

        transcript = ""
        for i, pair in enumerate(qa_pairs, 1):
            transcript += f"\nQ{i}: {pair['question']}\nA{i}: {pair['answer']}\n"

        prompt = f"""You assessed a technical interview for the role of {role}.
Candidate level: {level}
Candidate's stated skills: {skills_str}

Full transcript:
{transcript}

Provide a post-interview assessment in this exact format:

INSIGHTS:
[Write 3-4 sentences. Analyze actual answers given. Call out specific strengths, weaknesses, or notable observations. Reference particular questions and answers. Be direct and specific — avoid generic filler.]

OVERALL_ASSESSMENT:
[Write 1-2 sentences with a direct verdict. Example: "The candidate shows solid understanding of X but inconsistent grasp of Y. Recommend a follow-up focused on Z." Be honest.]

TOPICS_COVERED:
[Comma-separated list of distinct technical topics that came up meaningfully in the interview]"""

        response = self.model.generate_content(prompt)
        text = response.text.strip()

        insights = ""
        overall = ""
        topics: List[str] = []

        if "INSIGHTS:" in text:
            after_insights = text.split("INSIGHTS:", 1)[1]
            if "OVERALL_ASSESSMENT:" in after_insights:
                insights_part, after_overall = after_insights.split("OVERALL_ASSESSMENT:", 1)
                insights = insights_part.strip()
                if "TOPICS_COVERED:" in after_overall:
                    overall_part, topics_part = after_overall.split("TOPICS_COVERED:", 1)
                    overall = overall_part.strip()
                    topics = [t.strip() for t in topics_part.strip().split(",") if t.strip()]
                else:
                    overall = after_overall.strip()
            else:
                insights = after_insights.strip()

        return {
            "insights": insights or text,
            "overall_assessment": overall or "Assessment not available.",
            "topics_covered": topics or ["General technical concepts"],
        }


question_generator = QuestionGenerator()
