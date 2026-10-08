export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  
  // Batalkan suara yang sedang berjalan
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  utterance.rate = 1.0;
  
  window.speechSynthesis.speak(utterance);
}
