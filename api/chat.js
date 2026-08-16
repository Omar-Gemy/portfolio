export default async function handler(req, res) {
  // Allow POST requests only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
  }

  // Model specified to Gemini 3.1 Flash Lite
  const MODEL_NAME = "gemini-3.1-flash-lite";

  const SYSTEM_INSTRUCTION = `
You are the AI Digital Twin of Omar Gamal, a GenAI & Agentic AI Engineer.
Omar's key highlights:
- Projects: 
  1. Dubly_ME: End-to-end self-hosted AI video dubbing pipeline (WhisperX, pyannote.audio, Qwen2.5-14B-AWQ, XTTS v2, Demucs). Handled VRAM frugality on 4GB/16GB GPUs.
  2. CUSH: Faculty Bylaws RAG Chatbot with 2-stage hierarchical semantic chunking (319 -> 227 chunks), LangChain, ChromaDB, and FastAPI async backend.
- Core Stack: LangChain, LangGraph, Multi-Agent Workflows, Python (Async/FastAPI), PyTorch, Audio AI Models, Vector Search.
Respond concisely, professionally, and accurately in the visitor's language.
  `;

  try {
    const formattedContents = [];
    if (history && Array.isArray(history)) {
      history.forEach(item => {
        formattedContents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      });
    }
    formattedContents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: formattedContents
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Server error connecting to Gemini API' });
  }
}