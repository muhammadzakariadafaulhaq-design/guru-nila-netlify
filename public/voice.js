export function speechRecognitionAvailable() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function listenArabic({ onText, onStatus, onError }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    onError?.('Pengenal suara belum didukung browser ini. Silakan ketik pesan.');
    return null;
  }
  const recognition = new Recognition();
  recognition.lang = 'ar-SA';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => onStatus?.('Mendengarkan bahasa Arab… silakan berbicara.');
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (transcript) onText?.(transcript);
  };
  recognition.onerror = (event) => onError?.(`Pengenal suara bermasalah (${event.error}). Coba ketik pesan.`);
  recognition.onend = () => onStatus?.('Selesai mendengarkan.');
  try { recognition.start(); } catch { onError?.('Mikrofon tidak dapat dimulai. Periksa izin browser.'); }
  return recognition;
}

export function speakArabic(text, onStatus = () => {}) {
  if (!('speechSynthesis' in window)) {
    onStatus('Fitur suara keluar tidak tersedia pada browser ini.');
    return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.88;
  utterance.onstart = () => onStatus('Guru Nila sedang berbicara…');
  utterance.onend = () => onStatus('Suara selesai.');
  utterance.onerror = () => onStatus('Suara tidak dapat diputar; periksa pilihan suara Arab di perangkat.');
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith('ar'));
  if (arabicVoice) utterance.voice = arabicVoice;
  window.speechSynthesis.speak(utterance);
  return true;
}
