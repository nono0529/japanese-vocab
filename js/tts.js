/* ============================
   不背日语 — Japanese Text-to-Speech
   ============================ */

const TTS = {
  enabled: true,
  rate: 0.9,
  pitch: 1.0,
  voice: null,
  initialized: false,

  async init() {
    if (this.initialized) return;
    if (!('speechSynthesis' in window)) {
      this.enabled = false;
      return;
    }

    try {
      const voices = await new Promise(resolve => {
        const v = speechSynthesis.getVoices();
        if (v.length) resolve(v);
        else {
          speechSynthesis.onvoiceschanged = () => {
            resolve(speechSynthesis.getVoices());
          };
        }
      });

      this.voice = voices.find(v => v.lang.startsWith('ja')) ||
                   voices.find(v => v.lang === 'ja-JP') ||
                   null;

      // Load settings
      this.enabled = (await getSetting('ttsEnabled', 'true')) === 'true';
      this.rate = parseFloat(await getSetting('ttsRate', '0.9'));
    } catch (e) {
      console.warn('[TTS] Init failed:', e);
      this.enabled = false;
    }

    this.initialized = true;
  },

  speak(text, forceJapanese = true) {
    if (!this.enabled || !text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = forceJapanese ? 'ja-JP' : 'zh-CN';
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.voice) {
      utterance.voice = this.voice;
    }

    speechSynthesis.speak(utterance);
  },

  speakWord(japanese) {
    this.speak(japanese, true);
  },

  async toggle() {
    this.enabled = !this.enabled;
    await setSetting('ttsEnabled', String(this.enabled));
    if (!this.enabled) speechSynthesis.cancel();
    return this.enabled;
  },

  async setRate(rate) {
    this.rate = rate;
    await setSetting('ttsRate', String(rate));
  }
};
