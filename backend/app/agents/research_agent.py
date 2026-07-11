from typing import TypedDict, List, Optional, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage
from groq import Groq
from app.core.config import settings
from app.rag.pipeline import run_rag_pipeline
from loguru import logger
import json


class AgentState(TypedDict):
    task: str
    collection_name: str
    llm_model: str
    messages: List[dict]
    retrieved_chunks: int
    answer: str
    sources: List[str]
    tokens_used: int
    steps: List[dict]
    needs_rag: bool
    final: bool


def get_groq_client():
    return Groq(api_key=settings.GROQ_API_KEY)


def decide_if_rag_needed(state: AgentState) -> AgentState:
    logger.info("Step 1: Deciding if RAG retrieval is needed...")
    client = get_groq_client()

    prompt = f"""You are a decision-making agent. Determine if the following question requires 
searching through uploaded documents or if you can answer from general knowledge.

Question: {state['task']}

Respond with ONLY a JSON object like this:
{{"needs_rag": true, "reason": "why"}}

Set needs_rag to true if the question is about specific documents, data, or domain knowledge.
Set needs_rag to false if it's a general knowledge question."""

    response = client.chat.completions.create(
        model=state['llm_model'],
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=100
    )

    content = response.choices[0].message.content.strip()
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        decision = json.loads(content)
        needs_rag = decision.get("needs_rag", True)
        reason = decision.get("reason", "")
    except:
        needs_rag = True
        reason = "Defaulting to RAG"

    logger.info(f"RAG decision: {needs_rag} — {reason}")

    state["needs_rag"] = needs_rag
    state["steps"].append({
        "agent": "DecisionAgent",
        "action": "decide_rag",
        "output": f"needs_rag={needs_rag}: {reason}"
    })
    state["tokens_used"] += response.usage.total_tokens if response.usage else 0
    return state


def retrieve_and_answer(state: AgentState) -> AgentState:
    logger.info("Step 2: Retrieving from knowledge base and generating answer...")

    result = run_rag_pipeline(
        query=state["task"],
        collection_name=state["collection_name"],
        model=state["llm_model"],
        n_results=5,
        use_hybrid=True
    )

    state["answer"] = result["answer"]
    state["sources"] = result["sources"]
    state["tokens_used"] += result["tokens_used"]
    state["retrieved_chunks"] = result["chunks_used"]
    state["steps"].append({
        "agent": "ResearchAgent",
        "action": "rag_retrieval",
        "output": f"Retrieved {result['chunks_used']} chunks, sources: {result['sources']}"
    })
    state["final"] = True
    return state


def answer_from_knowledge(state: AgentState) -> AgentState:
    logger.info("Step 2: Answering from general knowledge...")
    client = get_groq_client()

    response = client.chat.completions.create(
        model=state['llm_model'],
        messages=[{"role": "user", "content": state["task"]}],
        temperature=0.7,
        max_tokens=500
    )

    state["answer"] = response.choices[0].message.content
    state["sources"] = ["general_knowledge"]
    state["tokens_used"] += response.usage.total_tokens if response.usage else 0
    state["retrieved_chunks"] = 0
    state["steps"].append({
        "agent": "ResearchAgent",
        "action": "general_knowledge",
        "output": "Answered from general knowledge"
    })
    state["final"] = True
    return state


def validate_answer(state: AgentState) -> AgentState:
    logger.info("Step 3: Critic agent validating answer...")
    client = get_groq_client()

    prompt = f"""You are a critic agent. Review this answer for accuracy and completeness.

Question: {state['task']}
Answer: {state['answer']}

If the answer is good, respond with: {{"valid": true, "improved_answer": null}}
If you can improve it, respond with: {{"valid": false, "improved_answer": "your better answer here"}}

Respond ONLY with JSON."""

    response = client.chat.completions.create(
        model=state['llm_model'],
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=600
    )

    content = response.choices[0].message.content.strip()
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        validation = json.loads(content)
        if not validation.get("valid") and validation.get("improved_answer"):
            state["answer"] = validation["improved_answer"]
            state["steps"].append({
                "agent": "CriticAgent",
                "action": "improve_answer",
                "output": "Answer improved by critic"
            })
        else:
            state["steps"].append({
                "agent": "CriticAgent",
                "action": "validate",
                "output": "Answer validated as correct"
            })
    except:
        state["steps"].append({
            "agent": "CriticAgent",
            "action": "validate",
            "output": "Validation skipped"
        })

    state["tokens_used"] += response.usage.total_tokens if response.usage else 0
    return state


def route_after_decision(state: AgentState) -> str:
    if state.get("needs_rag", True):
        return "retrieve_and_answer"
    return "answer_from_knowledge"


def build_research_agent():
    workflow = StateGraph(AgentState)

    workflow.add_node("decide", decide_if_rag_needed)
    workflow.add_node("retrieve_and_answer", retrieve_and_answer)
    workflow.add_node("answer_from_knowledge", answer_from_knowledge)
    workflow.add_node("validate", validate_answer)

    workflow.set_entry_point("decide")

    workflow.add_conditional_edges(
        "decide",
        route_after_decision,
        {
            "retrieve_and_answer": "retrieve_and_answer",
            "answer_from_knowledge": "answer_from_knowledge"
        }
    )

    workflow.add_edge("retrieve_and_answer", "validate")
    workflow.add_edge("answer_from_knowledge", "validate")
    workflow.add_edge("validate", END)

    return workflow.compile()


def run_research_agent(
    task: str,
    collection_name: str,
    llm_model: str = "llama-3.3-70b-versatile"
) -> dict:
    logger.info(f"Starting Research Agent for task: '{task[:50]}...'")

    agent = build_research_agent()

    initial_state = AgentState(
        task=task,
        collection_name=collection_name,
        llm_model=llm_model,
        messages=[],
        retrieved_chunks=0,
        answer="",
        sources=[],
        tokens_used=0,
        steps=[],
        needs_rag=True,
        final=False
    )

    final_state = agent.invoke(initial_state)

    return {
        "answer": final_state["answer"],
        "sources": final_state["sources"],
        "tokens_used": final_state["tokens_used"],
        "chunks_used": final_state["retrieved_chunks"],
        "steps": final_state["steps"],
        "agents_used": list(set([s["agent"] for s in final_state["steps"]]))
    }