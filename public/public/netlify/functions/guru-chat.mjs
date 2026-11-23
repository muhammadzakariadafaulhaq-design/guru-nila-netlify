import { json, sameOrigin, verifySession } from './_auth.mjs';

export const config = { path: '/api/guru-chat' };

const SYSTEM_INSTRUCTION = `You are Guru Nila, a patient Arabic language teacher in Hilyah's Home Schooling.\n\nLANGUAGE: Use clear Modern Standard Arabic (الفصحى) by default. Do not switch to Indonesian unless the learner explicitly asks for a translation or explanation in Indonesian.\n\nTEACHING: Adapt to an intermediate beginner-to-intermediate learner. Correct grammar (النحو), morphology (الصرف), word choice, sentence order, and pronunciation-related text gently. Explain one or two important corrections at a time, give a corrected example, then ask one useful follow-up question in Arabic. Encourage the learner without exaggerated praise.\n\nISLAMIC STUDIES: When discussing Qur'an, hadith, or fiqh, distinguish verified source text from explanation. Never invent Qur'anic verses, hadith wording, narrator attributions, or scholarly quotations. Say when you are unsure and encourage checking with a qualified teacher.\n\nPRIVACY: Use only the academic context supplied in this request. Do not ask for passwords, addresses, phone numbers, or private family information. Do not claim to remember anything unless the application has explicitly supplied it.\n\nFORMAT: Keep answers readable and concise. Arabic text should be properly written right-to-left. If the learner explicitly asks for Indonesian meaning, provide it separately and briefly.`;

function validHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).map((item) => {
    const role = item?.role === 'model' ? 'model' : 'user';
    const text = typeof item?.text === 'string' ? item.text.slice(0, 1200) : '';
    return { role, parts: [{ text }] };
  }).filter((item) => item.parts[0].text.trim());
}

function safeAcademicContext(value) {
  if (!value || typeof value !== 'object') return '';
  const allowed = {
    currentLevel: typeof value.currentLevel === 'string' ? value.currentLevel.slice(0, 80) : '',
    focus: typeof value.focus === 'string' ? value.focus.slice(0, 120) : '',
    weakTopics: Array.isArray(value.weakTopics) ? value.weakTopics.slice(0, 5).map((x) => String(x).slice(0, 70)) : [],
    recentVocabulary: Array.isArray(value.recentVocabulary) ? value.recentVocabulary.slice(0, 10).map((x) => String(x).slice(0, 50)) : [],
  };
  return JSON.stringify(allowed);
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, { Allow: 'POST' });
  if (!sameOrigin(request)) return json({ error: 'Permintaan lintas situs ditolak.' }, 403);
  if (!verifySession(request)) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'GEMINI_API_KEY belum dipasang di Netlify.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Format permintaan tidak valid.' }, 400); }
  const maxInput = Math.min(6000, Math.max(500, Number(process.env.MAX_INPUT_CHARS) || 3500));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'Tulis atau ucapkan kalimat terlebih dahulu.' }, 400);
  if (message.length > maxInput) return json({ error: `Pesan terlalu panjang. Batas ${maxInput} karakter.` }, 413);

  const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').replace(/[^a-zA-Z0-9._-]/g, '');
  const maxOutputTokens = Math.min(800, Math.max(128, Number(process.env.MAX_OUTPUT_TOKENS) || 450));
  const history = validHistory(body?.history);
  const academicContext = safeAcademicContext(body?.academicContext);
  const contextText = academicContext ? `Academic learning context (not personal diary): ${academicContext}` : '';
  const contents = [
    ...(contextText ? [{ role: 'user', parts: [{ text: contextText }] }, { role: 'model', parts: [{ text: 'سأستخدم هذه المعلومات الأكاديمية المحدودة لتكييف الدرس.' }] }] : []),
    ...history,
    { role: 'user', parts: [{ text: message }] },
  ];

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: { temperature: 0.55, maxOutputTokens },
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    return json({ error: 'Guru Nila belum dapat terhubung. Periksa koneksi lalu coba lagi.' }, 502);
  }

  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : 502;
    return json({ error: upstream.status === 429 ? 'Kuota atau batas permintaan Gemini sedang tercapai. Coba lagi nanti.' : 'Layanan AI sedang bermasalah. Coba lagi beberapa saat.' }, status);
  }
  const reply = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!reply) return json({ error: 'Guru Nila belum menghasilkan jawaban. Coba ubah pertanyaanmu.' }, 502);
  return json({ reply, model });
}
