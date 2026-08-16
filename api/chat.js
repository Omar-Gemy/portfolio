module.exports = async function handler(req, res) {
  // ضبط عناوين CORS للطلبات
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // قراءة مفتاح الـ API من سيرفر Vercel
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ 
      reply: "⚠️ لم يتم العثور على GEMINI_API_KEY في إعدادات Vercel. يرجى التأكد من إضافته في Environments ثم عمل Redeploy." 
    });
  }

  // معالجة الـ Body بأمان
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const userMessage = body?.message || "";
  const history = body?.history || [];

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const SYSTEM_INSTRUCTION = `
You are the AI Digital Twin of Omar Gamal, a GenAI & Agentic AI Engineer.
Omar's key highlights:
- Projects: 
  1. Dubly_ME: End-to-end self-hosted AI video dubbing pipeline (WhisperX, pyannote.audio, Qwen2.5-14B-AWQ, XTTS v2, Demucs). Handled VRAM frugality on 4GB/16GB GPUs.
  2. CUSH: Faculty Bylaws RAG Chatbot with 2-stage hierarchical semantic chunking (319 -> 227 chunks), LangChain, ChromaDB, and FastAPI async backend.
- Core Stack: LangChain, LangGraph, Multi-Agent Workflows, Python (Async/FastAPI), PyTorch, Audio AI Models, Vector Search.
Respond concisely, professionally, and accurately in the visitor's language.
  `;

  // قائمة الموديلات المتاحة للتجربة بالترتيب
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash"
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const formattedContents = [];
      if (Array.isArray(history)) {
        history.forEach(item => {
          formattedContents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
          });
        });
      }
      formattedContents.push({ role: 'user', parts: [{ text: userMessage }] });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ 
          reply: data.candidates[0].content.parts[0].text 
        });
      }

      if (data.error) {
        lastError = data.error.message;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(200).json({ 
    reply: `⚠️ تعذر الحصول على رد من الموديل. السبب: ${lastError || 'يرجى التحقق من صحة المفتاح في Vercel.'}` 
  });
};