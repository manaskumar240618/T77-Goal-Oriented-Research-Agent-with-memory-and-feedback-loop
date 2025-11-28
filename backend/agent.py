import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict, Annotated, List
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
import operator

load_dotenv()

google_key = os.getenv("GOOGLE_API_KEY")
tavily_key = os.getenv("TAVILY_API_KEY")

if not google_key:
    raise ValueError("GOOGLE_API_KEY not found.")

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]

# --- SPEED OPTIMIZATION HERE ---
# 1. search_depth="basic": Skips deep analysis for raw speed.
# 2. max_results=1: Reads fewer pages (faster processing).
tool = TavilySearchResults(
    max_results=1, 
    search_depth="basic", 
    tavily_api_key=tavily_key
)

# Brain Setup
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", 
    temperature=0,
    google_api_key=google_key
)

def researcher_node(state: AgentState, config):
    messages = state['messages']
    is_critical_mode = config.get("configurable", {}).get("critical_mode", False)
    
    base_prompt = """You are Intellica, an advanced AI Researcher."""
    
    if is_critical_mode:
        instruction = """
        MODE: CRITICAL THINKING
        Critique the premise. Provide counter-arguments and risks.
        """
    else:
        instruction = """
        MODE: SPEED & ACCURACY
        Answer directly and concisely. Do not waffle.
        """

    formatting = """
    AFTER your answer, on a new line, output strictly this format:
    Suggestions: [Related Topic 1, Related Topic 2, Related Topic 3]
    Finally, end with a polite feedback question (MAX 15 WORDS).
    """
    
    system_message = SystemMessage(content=base_prompt + instruction + formatting)
    
    if not isinstance(messages[0], SystemMessage):
        messages = [system_message] + messages
    else:
        messages[0] = system_message 
        
    response = llm.invoke(messages)
    return {"messages": [response]}

def search_tool_node(state: AgentState):
    last_message = state['messages'][-1]
    content = last_message.content
    query = content.replace("SEARCH:", "").strip()
    
    try:
        # Simple invocation for speed
        search_results = tool.invoke(query)
        result_content = f"Search Results: {search_results}"
    except Exception as e:
        result_content = f"Search failed: {str(e)}"
    
    return {"messages": [AIMessage(content=result_content)]}

def should_continue(state: AgentState):
    last_message = state['messages'][-1]
    if "SEARCH:" in last_message.content:
        return "search"
    return "end"

workflow = StateGraph(AgentState)
workflow.add_node("researcher", researcher_node)
workflow.add_node("search_tool", search_tool_node)
workflow.set_entry_point("researcher")

workflow.add_conditional_edges(
    "researcher",
    should_continue,
    {
        "search": "search_tool",
        "end": END
    }
)
workflow.add_edge("search_tool", "researcher")

memory = MemorySaver()
app = workflow.compile(checkpointer=memory)